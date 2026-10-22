import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Tamaño máximo por archivo (10 MB) para evitar agotar el disco con uploads abusivos.
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

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
      // Validación de tamaño: previene errores ENOSPC (no space left on device).
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `El archivo "${file.name}" excede el tamaño máximo permitido (${MAX_FILE_SIZE / 1024 / 1024} MB)` },
          { status: 413 }
        );
      }

      // Allow overriding filename via form data key 'filename_<originalName>'
      const customName = formData.get(`filename_${file.name}`);
      const rawName = (customName ? (customName as string) : file.name) ?? '';

      // Sanitización del nombre: evita path traversal (../../etc) y caracteres
      // inválidos en Windows que provocan fallos EINVAL/EACCES al escribir.
      const fileName = path.basename(rawName).replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim();
      if (!fileName || fileName === '.' || fileName === '..') {
        return NextResponse.json({ error: `Nombre de archivo inválido: "${rawName}"` }, { status: 400 });
      }

      // Solo permitir imágenes conocidas (mantiene compatibilidad con los flujos existentes).
      const ext = path.extname(fileName).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: "${fileName}". Permitidos: ${ALLOWED_EXTENSIONS.join(', ')}` },
          { status: 415 }
        );
      }

      const filePath = path.join(uploadDir, fileName);

      // Doble verificación: el destino final debe quedar dentro de uploadDir.
      if (!filePath.startsWith(uploadDir + path.sep)) {
        return NextResponse.json({ error: 'Ruta de destino no permitida' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(filePath, buffer);
      savedFiles.push(fileName);
    }

    return NextResponse.json({ success: true, savedFiles });
  } catch (error: any) {
    console.error('Error uploading file:', error);

    // ENOSPC: disco lleno -> respuesta clara en lugar de un 500 genérico.
    if (error?.code === 'ENOSPC') {
      return NextResponse.json(
        { error: 'No hay espacio suficiente en el disco del servidor. Libere espacio e intente nuevamente.' },
        { status: 507 }
      );
    }
    return NextResponse.json({ error: error?.message || 'Error uploading file' }, { status: 500 });
  }
}
