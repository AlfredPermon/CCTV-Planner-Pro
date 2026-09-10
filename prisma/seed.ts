import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash("Admin1234!", 10);

    const admin = await prisma.user.upsert({
        where: { email: "admin@editorcctv.com" },
        update: {},
        create: {
            email: "admin@editorcctv.com",
            name: "Admin CCTV",
            password: hashedPassword,
            role: Role.ADMIN,
        },
    });

    console.log({ admin });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
