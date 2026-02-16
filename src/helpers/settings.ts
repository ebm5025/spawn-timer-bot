import prisma from "../db.js";

export async function getSettingByKey(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function saveSettingByKey(
  key: string,
  value: string
): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function deleteSettingByKey(key: string): Promise<void> {
  await prisma.setting.deleteMany({ where: { key } });
}
