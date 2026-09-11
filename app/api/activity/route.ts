import { activityRows, apiError, checkOrigin, database, identity, noStore, today } from "@/lib/library";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{checkOrigin(request);const owner=await identity();await database().prepare("INSERT INTO activity (owner_id,day,visits,uploads) VALUES (?,?,1,0) ON CONFLICT(owner_id,day) DO UPDATE SET visits = 1").bind(owner,today()).run();return Response.json({activity:await activityRows(owner),today:today()},{headers:noStore});}catch(e){return apiError(e);}}
