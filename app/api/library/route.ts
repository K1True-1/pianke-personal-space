import { activityRows, apiError, database, noStore, today } from "@/lib/library";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await getChatGPTUser();if(!user)return Response.json({items:[],activity:[],today:today()},{headers:noStore});const rows=await database().prepare("SELECT id,kind,title,description,filename,mime,size,language,created_at,preview_key IS NOT NULL AS has_preview FROM items WHERE owner_id = ? ORDER BY created_at DESC").bind(user.userId).all();return Response.json({items:rows.results,activity:await activityRows(user.userId),today:today()},{headers:noStore});}catch(error){return apiError(error);}}
