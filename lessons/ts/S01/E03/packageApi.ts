import chalk from "chalk";

const PACKAGES_API = "https://hub.ag3nts.org/api/packages";

const apiKey = () => {
  const key = process.env.API_KEY_AI_DEVS4;
  if (!key) throw new Error("API_KEY_AI_DEVS4 is not set");
  return key;
};

export type CheckPackageResult = {
  status: string;
  sender?: string;
  recipient?: string;
  contents?: string;
  location?: string;
  [key: string]: unknown;
};

export type RedirectPackageResult = {
  confirmation?: string;
  status?: string;
  [key: string]: unknown;
};

export const checkPackage = async (
  packageId: string
): Promise<CheckPackageResult> => {
  console.log(chalk.gray(`[packageApi] checkPackage: ${packageId}`));
  const res = await fetch(PACKAGES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: apiKey(), action: "check", packageId }),
  });
  const data = await res.json();
  console.log(chalk.gray(`[packageApi] checkPackage response:`), data);
  return data as CheckPackageResult;
};

export const redirectPackage = async (
  packageId: string,
  destination: string,
  code: string
): Promise<RedirectPackageResult> => {
  console.log(
    chalk.gray(`[packageApi] redirectPackage: ${packageId} → ${destination} (code: ${code})`)
  );
  const res = await fetch(PACKAGES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: apiKey(),
      action: "redirect",
      packageId,
      destination,
      code,
    }),
  });
  const data = await res.json();
  console.log(chalk.gray(`[packageApi] redirectPackage response:`), data);
  return data as RedirectPackageResult;
};
