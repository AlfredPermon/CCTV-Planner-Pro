import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'FOTOS_SISTEMAS');
    await fs.mkdir(uploadDir, { recursive: true });

    const savedFiles: string[] = [];

    for (const file of files) {
      // Allow overriding filename via form data key 'filename_<originalName>'
      const customName = formData.get(`filename_${file.name}`);
      const fileName = customName ? (customName as string) : file.name;
      
      const filePath = path.join(uploadDir, fileName);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      await fs.writeFile(filePath, buffer);
      savedFiles.push(fileName);
    }

    return NextResponse.json({ success: true, savedFiles });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: error?.message || 'Error uploading file' }, { status: 500 });
  }
}
