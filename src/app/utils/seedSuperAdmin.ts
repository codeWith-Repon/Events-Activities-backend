import { prisma } from "../../lib/prisma";
import { envVars } from "../config/env";
import bcryptjs from "bcryptjs";
import { Status, UserRole } from "../../generated/prisma/enums";

export const seedSuperAdmin = async () => {
    const isSuperAdminExist = await prisma.user.findFirst({
        where: {
            email: envVars.SUPER_ADMIN_EMAIL
        }
    });

    if (isSuperAdminExist) {
        console.log("⚡ Super Admin Already Exists");
        return;
    }

    console.log("↻ Trying to create Super Admin...");

    const hashedPassword = await bcryptjs.hash(
        envVars.SUPER_ADMIN_PASSWORD,
        Number(envVars.BCRYPT_SALT_ROUND)
    );

    // Super Admin Payload
    const payload = {
        name: envVars.SUPER_ADMIN_NAME,
        email: envVars.SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        profileImage: "https://as1.ftcdn.net/v2/jpg/05/03/57/70/1000_F_503577073_y4ZwKcQttFbUut0A7InyK8LhS3ObKL2t.jpg",
        contactNumber: "xxxxxxxxxxxx",
        address: "xxxxxxxxxxxx",
        dob: new Date(),
        status: Status.ACTIVE,
        isVerified: true,
        isDeleted: false,
    };

    const superAdmin = await prisma.user.create({
        data: payload,
    });

    console.log("✅ Super Admin Created Successfully! \n");
    console.log(superAdmin)
};
