import PersonalSpace from "./personal-space";
import { getChatGPTUser } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  return <PersonalSpace signedIn={!!user} />;
}
