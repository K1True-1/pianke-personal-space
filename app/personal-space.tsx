"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Camera, Check, ChevronRight, Code2, Copy, Download, Images, Lightbulb, LockKeyhole, Plus, Trash2, Upload, UserRound } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { uploadFile, savePhotoPreview } from "@/lib/photo-upload";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ActivityGrid, PhotoArtwork, useSpacePreferences } from "@/components/space-motion";
import { toast, Toaster } from "sonner";

type Kind = "photo" | "code" | "novel";
type Item = { id:string; kind:Kind; title:string; description:string; filename:string; size:number; created_at:string; mime:string; language:string; has_preview?:boolean;sample?:boolean; url?:string; credit?:string; source?:string };
type Day = { day:string; visits:number; uploads:number };
const kindLabels: Record<Kind,string> = {photo:"照片",code:"代码",novel:"小说"};
const accept: Record<Kind,string> = {photo:".jpg,.jpeg,.png,.webp,.gif",code:".js,.ts,.jsx,.tsx,.py,.html,.css,.json,.sql,.sh,.go,.rs,.java,.c,.cpp,.h,.vue,.svelte,.yml,.yaml,.md,.txt,.zip",novel:".txt,.md"};
const hint:Record<Kind,string> = {photo:"JPG、PNG、WebP、GIF · 分片上传，保留完整原图",code:"常见代码文件或 ZIP · 大文件分片上传",novel:"TXT、Markdown · UTF-8 或 GB18030 · 大文件分片上传"};
const samples:Item[] = [
  {id:"sample-coast",kind:"photo",title:"海岸，阴天",description:"在海边，留一点时间给自己。",filename:"coast.jpg",size:0,created_at:"2026-09-11T00:00:00Z",mime:"image/jpeg",language:"",sample:true,url:"/photos/coast.jpg",credit:"Engin Akyurt",source:"https://unsplash.com/it/foto/costa-rocciosa-con-oceano-calmo-sotto-cielo-nuvoloso-LdSnZwPutjY"},
  {id:"sample-architecture",kind:"photo",title:"光落在建筑上",description:"日常之中，也有值得停下的线条。",filename:"architecture.jpg",size:0,created_at:"2026-09-11T00:00:00Z",mime:"image/jpeg",language:"",sample:true,url:"/photos/architecture.jpg",credit:"Declan Sun",source:"https://unsplash.com/photos/modern-building-with-curved-facade-framed-by-trees-HW9PmuGve-M"},
];
const localDay = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const sizeLabel = (n:number) => n<1024*1024 ? `${Math.max(1,Math.round(n/1024))} KB` : `${(n/1024/1024).toFixed(1)} MB`;
const dateLabel = (s:string) => new Date(s).toLocaleDateString("zh-CN",{month:"long",day:"numeric",timeZone:"Asia/Shanghai"});
async function readResponse(r:Response){ const d=await r.json() as {error?:string;items:Item[];activity:Day[];today:string}; if(!r.ok) throw new Error(d.error||"暂时无法完成，请稍后重试。"); return d; }

function GalleryEmpty({kind,onUpload}:{kind:Kind;onUpload:(kind:Kind,trigger:HTMLElement)=>void}) { return <Empty className="empty-state"><EmptyHeader>{kind==="code"?<Code2 size={28}/>:kind==="novel"?<BookOpen size={28}/>:<Images size={28}/>}<EmptyTitle>{kind==="novel"?"把你的故事，放上书架":kind==="code"?"留住每一次灵感实现":"你的第一张照片，从这里开始"}</EmptyTitle><EmptyDescription>{kind==="novel"?"上传自己的小说，随时打开继续阅读。":kind==="code"?"上传代码文件，在线查看、复制或下载。":"上传生活片段，让相册慢慢丰富起来。"}</EmptyDescription></EmptyHeader><button className="primary-button" onClick={event=>onUpload(kind,event.currentTarget)}><Plus size={16}/>上传{kindLabels[kind]}</button></Empty>; }

export default function PersonalSpace({signedIn}:{signedIn:boolean}) {
  const { compact, motion } = useSpacePreferences();
  const uploadTrigger = useRef<HTMLElement | null>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const deleteTrigger = useRef<HTMLElement | null>(null);
  const mainUpload = useRef<HTMLButtonElement>(null);
  const restoreFocus = (target: HTMLElement | null) => {
    requestAnimationFrame(() => {
      const visible = target?.isConnected && target !== document.body && target.getClientRects().length > 0 && !target.matches(':disabled');
      (visible ? target : mainUpload.current)?.focus({ preventScroll: true });
    });
  };
  const [items,setItems]=useState<Item[]>([]); const [days,setDays]=useState<Day[]>([]);
  const [tab,setTab]=useState<Kind>("photo"); const [loading,setLoading]=useState(true); const [loadError,setLoadError]=useState("");
  const [uploadOpen,setUploadOpen]=useState(false); const [uploadKind,setUploadKind]=useState<Kind>("photo");
  const [file,setFile]=useState<File|null>(null); const [title,setTitle]=useState(""); const [description,setDescription]=useState("");
  const [saving,setSaving]=useState(false); const [formError,setFormError]=useState(""); const [dragging,setDragging]=useState(false);
  const [uploadProgress,setUploadProgress]=useState(0);const [uploadStage,setUploadStage]=useState("");const uploadAbort=useRef<AbortController|null>(null);
  const [detail,setDetail]=useState<Item|null>(null); const [text,setText]=useState(""); const [detailLoading,setDetailLoading]=useState(false);const [detailError,setDetailError]=useState("");
  const [readOffset,setReadOffset]=useState(0);const [nextOffset,setNextOffset]=useState<number|null>(null);const [previousOffsets,setPreviousOffsets]=useState<number[]>([]);
  const openDetail=(item:Item,trigger:HTMLElement)=>{detailTrigger.current=trigger;setCopied(false);setReadOffset(0);setPreviousOffsets([]);setNextOffset(null);setDetail(item);};
  const [deleteItem,setDeleteItem]=useState<Item|null>(null);const [deleting,setDeleting]=useState(false);
  const [copied,setCopied]=useState(false); const [today,setToday]=useState(localDay);const requestKey=useRef("");
  const counts={photo:items.filter(x=>x.kind==="photo").length,code:items.filter(x=>x.kind==="code").length,novel:items.filter(x=>x.kind==="novel").length};
  const load=useCallback(async()=>{setLoadError("");try{const d=await readResponse(await fetch("/api/library",{cache:"no-store"}));setItems(d.items);setDays(d.activity);if(d.today)setToday(d.today);}catch(e){setLoadError(e instanceof Error?e.message:"内容暂时无法加载");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(!signedIn)return;let active=true;const visit=()=>{if(document.visibilityState!=="visible")return;fetch("/api/activity",{method:"POST"}).then(readResponse).then(d=>{if(active){setDays(d.activity);setToday(d.today);}}).catch(()=>{if(active)setLoadError("使用记录暂时无法保存，请重试。");});};visit();const timer=setInterval(visit,60000);document.addEventListener("visibilitychange",visit);return()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",visit);};},[signedIn]);
  useEffect(()=>{if(!detail||detail.kind==="photo"||detail.filename.toLowerCase().endsWith(".zip")){setText("");return;}const controller=new AbortController();setDetailLoading(true);setDetailError("");setText("");fetch(`/api/library/${detail.id}?read=1&offset=${readOffset}`,{signal:controller.signal}).then(async r=>{if(!r.ok){const d=await r.json() as {error?:string};throw new Error(d.error||"读取失败");}const next=r.headers.get("X-Next-Offset");setNextOffset(next?Number(next):null);return r.text();}).then(setText).catch(e=>{if(e.name!=="AbortError")setDetailError("读取失败，请关闭后重新打开。");}).finally(()=>{if(!controller.signal.aborted)setDetailLoading(false);});return()=>controller.abort();},[detail,readOffset]);
  const beginUpload=(kind:Kind,trigger:HTMLElement)=>{uploadTrigger.current=trigger;setUploadKind(kind);setFile(null);setTitle("");setDescription("");setFormError("");requestKey.current=crypto.randomUUID();setUploadOpen(true);};
  const chooseFile=(next:File|undefined)=>{if(!next)return;const ext="."+next.name.split(".").pop()?.toLowerCase();if(!accept[uploadKind].split(",").includes(ext)){setFormError("这个分类暂不支持该格式，请选择提示中的文件类型。");return;}setFile(next);if(!title)setTitle(next.name.replace(/\.[^.]+$/,""));setFormError("");requestKey.current=crypto.randomUUID();};
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!file){setFormError("请先选择一个文件。");return;}setSaving(true);setFormError("");setUploadProgress(0);setUploadStage("正在上传原文件");const controller=new AbortController();uploadAbort.current=controller;try{const id=await uploadFile(file,uploadKind,title,description,requestKey.current,controller.signal,setUploadProgress);if(uploadKind==="photo"){setUploadStage("原图已保存，正在生成预览");const previewSaved=await savePhotoPreview(file,id);if(!previewSaved)toast.info("原图已保存，预览暂时使用原图。");}setUploadOpen(false);setTab(uploadKind);toast.success(`${kindLabels[uploadKind]}已保存`);await load();}catch(e){if(e instanceof Error&&e.name==="AbortError"){setFormError("上传已取消，文件和填写内容已保留。");requestKey.current=crypto.randomUUID();}else setFormError(e instanceof Error?e.message:"保存失败，请重试。");}finally{setSaving(false);uploadAbort.current=null;}};
  const remove=async()=>{if(!deleteItem)return;setDeleting(true);try{await readResponse(await fetch(`/api/library/${deleteItem.id}`,{method:"DELETE"}));setDeleteItem(null);setDetail(null);toast.success("已删除");await load();}catch(e){toast.error(e instanceof Error?e.message:"删除失败，请重试");}finally{setDeleting(false);}};
  const photoItems=counts.photo?items.filter(x=>x.kind==="photo"):samples;
  const sectionCopy = {
    photo: { eyebrow: "PHOTO JOURNAL", title: "镜头里的片刻", description: "收藏光线，也收藏当时的心情。" },
    code: { eyebrow: "CODE COLLECTION", title: "让灵感，成为作品", description: "每一行代码，都留着思考的痕迹。" },
    novel: { eyebrow: "PERSONAL LIBRARY", title: "故事，从这里展开", description: "安放写下的文字，也为想象留一盏灯。" },
  }[tab];
  return <TooltipProvider delayDuration={180}><Toaster position="top-center" theme="dark" richColors />
    <div className="ambient-scene" aria-hidden="true" />
    <a className="skip-link" href="#workspace-content">跳到作品内容</a>
    <Tabs value={tab} onValueChange={value=>setTab(value as Kind)} orientation={compact?"horizontal":"vertical"} className="workspace">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="片刻首页"><span>片刻</span><small>PIANKE<br />PERSONAL ARCHIVE</small></Link>
        <TabsList className="nav-tabs" aria-label="作品分类" style={{"--active-nav":["photo","code","novel"].indexOf(tab)} as CSSProperties}>
          <span className="nav-indicator" aria-hidden="true" />
          <TabsTrigger value="photo"><Camera size={24} strokeWidth={1.6}/><span>照片</span><i className="nav-dot" aria-hidden="true"/></TabsTrigger>
          <TabsTrigger value="code"><Code2 size={24} strokeWidth={1.6}/><span>代码</span><i className="nav-dot" aria-hidden="true"/></TabsTrigger>
          <TabsTrigger value="novel"><BookOpen size={24} strokeWidth={1.6}/><span>小说</span><i className="nav-dot" aria-hidden="true"/></TabsTrigger>
        </TabsList>
        <div className="sidebar-foot"><div className="profile-mini"><span className="avatar"><UserRound size={20} strokeWidth={1.5}/></span><div><strong>我的个人空间</strong><span><LockKeyhole size={11}/>文件仅自己可见</span></div></div><p>把日常，变成值得回看的片刻。</p></div>
      </aside>
      <main id="workspace-content" className="main" tabIndex={-1}>
        <header className="intro"><div className="intro-copy" key={tab}><div className="eyebrow">{sectionCopy.eyebrow}</div><h1>{sectionCopy.title}</h1><p>{sectionCopy.description}</p></div><button ref={mainUpload} className="primary-button main-upload" aria-label="上传作品" onClick={event=>beginUpload(tab,event.currentTarget)}><Plus size={20} strokeWidth={1.6}/><span>上传作品</span></button></header>
        {loadError&&<div className="error-banner" role="alert"><span>{loadError}</span><button className="secondary-button" onClick={()=>void load()}>重试</button></div>}
        <TabsContent value="photo" className="collection-panel">
          {loading?<div className="photo-grid content-loading" aria-label="正在加载照片"><Skeleton className="photo-skeleton"/><Skeleton className="photo-skeleton"/></div>:photoItems.length?<div className="photo-grid">{photoItems.map((item,index)=><PhotoArtwork key={item.id} item={item} index={index} motion={motion} onOpen={trigger=>openDetail(item,trigger)}/>)}</div>:<GalleryEmpty kind="photo" onUpload={beginUpload}/>}
        </TabsContent>
        <TabsContent value="code" className="collection-panel"><div className="collection-label"><span>CODE / {String(counts.code).padStart(2,"0")}</span><span>保存 · 阅读 · 下载</span></div>{loading?<Skeleton className="collection-skeleton"/>:counts.code?<div className="code-list">{items.filter(x=>x.kind==="code").map((item,index)=><button className="code-card" key={item.id} onClick={event=>openDetail(item,event.currentTarget)} style={{"--order":Math.min(index,5)} as CSSProperties}><div className="code-card-head"><Code2 size={23}/><h2>{item.title}</h2><ArrowUpRight size={19}/></div><p>{item.description||item.filename}</p><footer><span>{item.language.toUpperCase()} · {sizeLabel(item.size)}</span><span>{dateLabel(item.created_at)}</span></footer></button>)}</div>:<GalleryEmpty kind="code" onUpload={beginUpload}/>}</TabsContent>
        <TabsContent value="novel" className="collection-panel"><div className="collection-label"><span>STORIES / {String(counts.novel).padStart(2,"0")}</span><span>写下的故事，慢慢读</span></div>{loading?<Skeleton className="collection-skeleton"/>:counts.novel?<div className="book-grid">{items.filter(x=>x.kind==="novel").map((item,index)=><button className="book" key={item.id} onClick={event=>openDetail(item,event.currentTarget)} style={{"--order":Math.min(index,5)} as CSSProperties}><div className="book-cover"><small>PERSONAL LIBRARY<br/>{String(index+1).padStart(2,"0")}</small><h2>{item.title}</h2><BookOpen size={27} strokeWidth={1.3}/></div><p>{dateLabel(item.created_at)} · {sizeLabel(item.size)}</p></button>)}</div>:<GalleryEmpty kind="novel" onUpload={beginUpload}/>}</TabsContent>
        <ActivityGrid days={days} loading={loading} today={today}/>
        <details className="ideas"><summary><span><Lightbulb size={16}/>下一份灵感</span><ChevronRight size={16}/></summary><div className="idea-grid"><article><small>01 /</small><h3>旅行地图</h3><p>把照片放在地图上，串起走过的城市和故事。</p></article><article><small>02 /</small><h3>项目实验室</h3><p>为代码配上演示，让想法成为可以体验的小作品。</p></article><article><small>03 /</small><h3>连载与创作手记</h3><p>小说按章更新，顺手记录人物设定和写作灵感。</p></article></div><p className="ideas-note">留给这个空间的未来构想。</p></details>
        <footer className="footer"><span>片刻 · 留下属于自己的痕迹</span><span>PHOTOS, CODE & STORIES.</span></footer>
      </main>
    </Tabs>
    <Dialog open={uploadOpen} onOpenChange={v=>{if(!saving)setUploadOpen(v);}}><DialogContent className="detail-dialog upload-dialog" showCloseButton={!saving} onCloseAutoFocus={event=>{event.preventDefault();restoreFocus(uploadTrigger.current);}}><DialogHeader><DialogTitle>上传{kindLabels[uploadKind]}</DialogTitle><DialogDescription>保存到你的个人空间，下次访问仍然可以找到。</DialogDescription></DialogHeader>{!signedIn?<><p>登录后即可上传，并自动记录每天的使用情况。</p><a href="/signin-with-chatgpt?return_to=%2F" target="_top" className="primary-button">使用 ChatGPT 登录</a></>:<form className="form-stack" onSubmit={submit}><Tabs value={uploadKind} onValueChange={v=>{setUploadKind(v as Kind);setFile(null);setFormError("");requestKey.current=crypto.randomUUID();}}><TabsList aria-label="上传类型">{(["photo","code","novel"] as Kind[]).map(k=><TabsTrigger key={k} value={k} disabled={saving}>{kindLabels[k]}</TabsTrigger>)}</TabsList></Tabs><label className={`dropzone ${dragging?"dragging":""}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);if(!saving)chooseFile(e.dataTransfer.files[0]);}}><Upload size={28}/><span className={file?"file-ready":""}>{file?`${file.name} · ${sizeLabel(file.size)}`:"点击选择，或把文件拖到这里"}</span><small>{hint[uploadKind]}</small><input type="file" key={uploadKind} accept={accept[uploadKind]} onChange={e=>chooseFile(e.target.files?.[0])} aria-label={`选择${kindLabels[uploadKind]}文件`} disabled={saving}/></label><label className="form-field">作品名称<input className="text-input" required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="给这个作品取个名字" disabled={saving}/></label><label className="form-field">简介 <span className="muted-small">可选</span><textarea className="text-input" maxLength={500} rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="写下一点背景，留给以后的自己。" disabled={saving}/></label>{saving&&<div><div className="detail-meta"><span aria-live="polite">{uploadStage}</span> · {uploadProgress}%</div><Progress value={uploadProgress} aria-label="文件上传进度" className="mt-2"/>{uploadProgress<100&&<button type="button" className="secondary-button mt-3" onClick={()=>uploadAbort.current?.abort()}>取消上传</button>}</div>}{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={()=>setUploadOpen(false)} disabled={saving}>取消</button><button type="submit" className="primary-button" disabled={saving}>{saving?"正在上传并保存…":<><Upload size={16}/>保存作品</>}</button></div></form>}</DialogContent></Dialog>
    <Dialog open={!!detail} onOpenChange={v=>{if(!v)setDetail(null);}}><DialogContent className="detail-dialog artwork-dialog" data-kind={detail?.kind} onCloseAutoFocus={event=>{event.preventDefault();restoreFocus(detailTrigger.current);}}><DialogHeader><DialogTitle>{detail?.title}</DialogTitle><DialogDescription>{detail?.description||detail?.filename||"展示样片"}</DialogDescription></DialogHeader>{detail?.kind==="photo"?<img className="detail-image" src={detail.url||`/api/library/${detail.id}${detail.has_preview?"?preview=1":""}`} alt={detail.title}/>:detail?.filename.toLowerCase().endsWith(".zip")?<p>这是一个代码压缩包，下载后可以查看全部文件。</p>:detailLoading?<Skeleton className="h-60 w-full"/>:detailError?<p role="alert" className="form-error">{detailError}</p>:detail?.kind==="novel"?<article className="reader">{text}</article>:<pre className="code-view"><code>{text}</code></pre>}{detail&&detail.kind!=="photo"&&!detail.filename.toLowerCase().endsWith(".zip")&&!detailLoading&&!detailError&&<Pagination aria-label="阅读分页"><PaginationContent><PaginationItem><button className="secondary-button" disabled={!previousOffsets.length} onClick={()=>{setReadOffset(previousOffsets[previousOffsets.length-1]);setPreviousOffsets(previousOffsets.slice(0,-1));}}>上一段</button></PaginationItem><PaginationItem><span className="detail-meta">第 {previousOffsets.length+1} 段</span></PaginationItem><PaginationItem><button className="secondary-button" disabled={nextOffset===null} onClick={()=>{if(nextOffset!==null){setPreviousOffsets([...previousOffsets,readOffset]);setReadOffset(nextOffset);}}}>下一段</button></PaginationItem></PaginationContent></Pagination>}{detail&&!detail.sample&&<div className="detail-actions"><a className="secondary-button" href={`/api/library/${detail.id}?download=1`} download={detail.filename}><Download size={15}/>下载原文件</a>{detail.kind==="code"&&text&&<button className="secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{toast.error("无法复制，请下载文件。");}}}>{copied?<Check size={15}/>:<Copy size={15}/>}复制本段</button>}<button className="secondary-button danger" onClick={event=>{deleteTrigger.current=event.currentTarget;setDeleteItem(detail);}}><Trash2 size={15}/>删除</button></div>}{detail?.sample&&<a className="sample-credit" href={detail.source} target="_blank" rel="noreferrer">摄影：{detail.credit} / Unsplash</a>}</DialogContent></Dialog>
    <AlertDialog open={!!deleteItem} onOpenChange={v=>{if(!v&&!deleting)setDeleteItem(null);}}><AlertDialogContent onCloseAutoFocus={event=>{event.preventDefault();restoreFocus(deleteTrigger.current);}}><AlertDialogHeader><AlertDialogTitle>删除「{deleteItem?.title}」？</AlertDialogTitle><AlertDialogDescription>文件会从个人空间中移除，无法撤销。已记录的活跃次数会保留。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>保留</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={e=>{e.preventDefault();void remove();}}>{deleting?"正在删除…":"确认删除"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </TooltipProvider>;
}

