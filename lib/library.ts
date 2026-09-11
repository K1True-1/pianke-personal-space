import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
export function database(){if(!env.DB)throw new ApiError(503,"内容库暂时不可用，请稍后重试。");return env.DB;}
export function bucket(){if(!env.BUCKET)throw new ApiError(503,"文件存储暂时不可用，请稍后重试。");return env.BUCKET;}
export async function identity(){const user=await getChatGPTUser();if(!user)throw new ApiError(401,"请先登录，再访问你的作品。");return user.userId;}
export function checkOrigin(request:Request){const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)throw new ApiError(403,"请求来源不匹配，请刷新页面后重试。");}
export function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export function since(){const d=new Date(today()+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-364);return d.toISOString().slice(0,10);}
export async function activityRows(owner:string){return (await database().prepare("SELECT day, visits, uploads FROM activity WHERE owner_id = ? AND day >= ? AND day <= ? ORDER BY day").bind(owner,since(),today()).all()).results;}
export function apiError(error:unknown){if(error instanceof ApiError)return Response.json({error:error.message},{status:error.status,headers:{"Cache-Control":"no-store"}});console.error("Library request failed",error);return Response.json({error:"暂时无法保存或读取，请稍后重试。已选择的文件和填写内容会保留。"},{status:503,headers:{"Cache-Control":"no-store"}});}
export const noStore={"Cache-Control":"private, no-store"};
export function decodeText(bytes:ArrayBuffer){try{return new TextDecoder("utf-8",{fatal:true}).decode(bytes);}catch{return new TextDecoder("gb18030").decode(bytes);}}
