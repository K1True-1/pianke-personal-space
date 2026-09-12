"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Aperture, ArrowUpRight, BookOpen, Check, ChevronLeft, ChevronRight, Code2, Copy, Download, Images, LockKeyhole, Maximize2, Plus, Trash2, Upload, Activity } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { uploadFile, savePhotoPreview } from "@/lib/photo-upload";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast, Toaster } from "sonner";
import { GalleryScene, MotionPhoto } from "./gallery-effects";

type Kind = "photo" | "code" | "novel";
type Item = { id:string; kind:Kind; title:string; description:string; filename:string; size:number; created_at:string; mime:string; language:string; has_preview?:boolean;sample?:boolean; url?:string; credit?:string; source?:string };
type Day = { day:string; visits:number; uploads:number };
const kindLabels: Record<Kind,string> = {photo:"照片",code:"代码",novel:"小说"};
const accept: Record<Kind,string> = {photo:".jpg,.jpeg,.png,.webp,.gif",code:".js,.ts,.jsx,.tsx,.py,.html,.css,.json,.sql,.sh,.go,.rs,.java,.c,.cpp,.h,.vue,.svelte,.yml,.yaml,.md,.txt,.zip",novel:".txt,.md"};
const hint:Record<Kind,string> = {photo:"JPG、PNG、WebP、GIF · 分片上传，保留完整原图",code:"常见代码文件或 ZIP · 大文件分片上传",novel:"TXT、Markdown · UTF-8 或 GB18030 · 大文件分片上传"};
const samples:Item[] = [
  {id:"sample-lake",kind:"photo",title:"山水之间",description:"雾落下来，山与湖都安静了。",filename:"alpine-lake.webp",size:0,created_at:"2026-09-12T00:00:00Z",mime:"image/webp",language:"",sample:true,url:"/photos/alpine-lake.webp"},
  {id:"sample-coast",kind:"photo",title:"海的尽头",description:"在海边，留一点时间给自己。",filename:"coastal-dusk.webp",size:0,created_at:"2026-09-12T00:00:00Z",mime:"image/webp",language:"",sample:true,url:"/photos/coastal-dusk.webp"},
  {id:"sample-summit",kind:"photo",title:"山与云",description:"等待第一束光，越过山脊。",filename:"alpine-dawn.webp",size:0,created_at:"2026-09-12T00:00:00Z",mime:"image/webp",language:"",sample:true,url:"/photos/alpine-dawn.webp"},
];
const localDay = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const sizeLabel = (n:number) => n<1024*1024 ? `${Math.max(1,Math.round(n/1024))} KB` : `${(n/1024/1024).toFixed(1)} MB`;
const dateLabel = (s:string) => new Date(s).toLocaleDateString("zh-CN",{month:"long",day:"numeric",timeZone:"Asia/Shanghai"});
const level = (n:number) => n===0?0:n===1?1:n<=3?2:n<=6?3:4;
async function readResponse(r:Response){ const d=await r.json() as {error?:string;items:Item[];activity:Day[];today:string}; if(!r.ok) throw new Error(d.error||"暂时无法完成，请稍后重试。"); return d; }

function ActivityGrid({days,loading,today}:{days:Day[];loading:boolean;today:string}) {
  const [selected,setSelected]=useState("");
  const grid=useMemo(()=>{
    const end=new Date(today+"T12:00:00Z"); const start=new Date(end); start.setUTCDate(end.getUTCDate()-364);
    const pad=(start.getUTCDay()+6)%7;
    const values:Array<{day:string;count:number}|null>=Array(pad).fill(null);
    const map=new Map(days.map(d=>[d.day,d.visits+d.uploads]));
    for(let i=0;i<365;i++){const date=new Date(start);date.setUTCDate(start.getUTCDate()+i);const day=date.toISOString().slice(0,10);values.push({day,count:map.get(day)||0});}
    while(values.length%7)values.push(null);
    return values;
  },[days,today]);
  const count=grid.reduce((sum,d)=>sum+(d?.count||0),0);
  const active=grid.filter(d=>d&&d.count>0).length;
  const months=Array.from({length:grid.length/7},(_,i)=>{
    const first=grid.slice(i*7,i*7+7).find(Boolean);
    const previous=i?grid.slice((i-1)*7,i*7).find(Boolean):null;
    return first&&(!previous||first.day.slice(0,7)!==previous.day.slice(0,7))?`${Number(first.day.slice(5,7))}月`:"";
  });
  return <section className="activity-card" aria-label="过去365天使用记录">
    <div className="activity-head"><h2><Activity size={17}/> 每一天，都留下痕迹</h2><span>过去 365 天 · 北京时间</span></div>
    <div className="heat-scroll"><div className="heat-inner">
      <div className="month-row" style={{gridTemplateColumns:`repeat(${months.length},minmax(0,1fr))`}}>{months.map((m,i)=><span key={i} style={{overflow:"visible",whiteSpace:"nowrap"}}>{m}</span>)}</div>
      <div className="heat-wrap"><div className="week-labels" aria-hidden="true">{["一","","三","","五","","日"].map((d,i)=><span key={i}>{d}</span>)}</div><div className="heat-grid">
      {grid.map((d,i)=>d?<Tooltip key={d.day}><TooltipTrigger asChild><button className="heat-cell" data-level={level(d.count)} aria-label={`${d.day}，${d.count} 次活动`} onClick={()=>setSelected(`${d.day} · ${d.count} 次活动`)} /></TooltipTrigger><TooltipContent>{d.day} · {d.count} 次活动</TooltipContent></Tooltip>:<span key={`blank-${i}`} className="heat-cell heat-empty"/>)}</div></div>
    </div></div>
    <div className="activity-foot"><span aria-live="polite">{loading?"正在读取使用记录…":selected||<><b>{count} 次活动</b>，活跃了 <b>{active} 天</b></>}<br/>每日首次访问 +1，每次上传 +1</span><div className="legend" aria-label="颜色越深活动越多"><span>少</span>{[0,1,2,3,4].map(i=><i className="legend-box" data-level={i} key={i}/>)}<span>多</span></div></div>
  </section>;
}

export default function PersonalSpace({signedIn}:{signedIn:boolean}) {
  const [items,setItems]=useState<Item[]>([]); const [days,setDays]=useState<Day[]>([]);
  const [tab,setTab]=useState<Kind>("photo"); const [loading,setLoading]=useState(true); const [loadError,setLoadError]=useState("");
  const [uploadOpen,setUploadOpen]=useState(false); const [uploadKind,setUploadKind]=useState<Kind>("photo");
  const [file,setFile]=useState<File|null>(null); const [title,setTitle]=useState(""); const [description,setDescription]=useState("");
  const [saving,setSaving]=useState(false); const [formError,setFormError]=useState(""); const [dragging,setDragging]=useState(false);
  const [uploadProgress,setUploadProgress]=useState(0);const [uploadStage,setUploadStage]=useState("");const uploadAbort=useRef<AbortController|null>(null);
  const [detail,setDetail]=useState<Item|null>(null); const [text,setText]=useState(""); const [detailLoading,setDetailLoading]=useState(false);const [detailError,setDetailError]=useState("");
  const [readOffset,setReadOffset]=useState(0);const [nextOffset,setNextOffset]=useState<number|null>(null);const [previousOffsets,setPreviousOffsets]=useState<number[]>([]);
  const detailDialogRef=useRef<HTMLDivElement>(null);
  const detailTrigger=useRef<HTMLElement|null>(null);
  const openDetail=(item:Item)=>{detailTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setReadOffset(0);setPreviousOffsets([]);setNextOffset(null);setCopied(false);setDetail(item);};
  const [deleteItem,setDeleteItem]=useState<Item|null>(null);const [deleting,setDeleting]=useState(false);
  const [copied,setCopied]=useState(false); const [today,setToday]=useState(localDay);const requestKey=useRef("");
  const [activityOpen,setActivityOpen]=useState(false);
  const [spaceOpen,setSpaceOpen]=useState(false);
  const counts={photo:items.filter(x=>x.kind==="photo").length,code:items.filter(x=>x.kind==="code").length,novel:items.filter(x=>x.kind==="novel").length};
  const load=useCallback(async()=>{setLoadError("");try{const d=await readResponse(await fetch("/api/library",{cache:"no-store"}));setItems(d.items);setDays(d.activity);if(d.today)setToday(d.today);}catch(e){setLoadError(e instanceof Error?e.message:"内容暂时无法加载");}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(!signedIn)return;let active=true;const visit=()=>{if(document.visibilityState!=="visible")return;fetch("/api/activity",{method:"POST"}).then(readResponse).then(d=>{if(active){setDays(d.activity);setToday(d.today);}}).catch(()=>{if(active)setLoadError("使用记录暂时无法保存，请重试。");});};visit();const timer=setInterval(visit,60000);document.addEventListener("visibilitychange",visit);return()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",visit);};},[signedIn]);
  useEffect(()=>{if(!detail||detail.kind==="photo"||detail.filename.toLowerCase().endsWith(".zip")){setText("");return;}const controller=new AbortController();setDetailLoading(true);setDetailError("");setText("");fetch(`/api/library/${detail.id}?read=1&offset=${readOffset}`,{signal:controller.signal}).then(async r=>{if(!r.ok){const d=await r.json() as {error?:string};throw new Error(d.error||"读取失败");}const next=r.headers.get("X-Next-Offset");setNextOffset(next?Number(next):null);return r.text();}).then(setText).catch(e=>{if(e.name!=="AbortError")setDetailError("读取失败，请关闭后重新打开。");}).finally(()=>{if(!controller.signal.aborted)setDetailLoading(false);});return()=>controller.abort();},[detail,readOffset]);
  const beginUpload=(kind:Kind)=>{setUploadKind(kind);setFile(null);setTitle("");setDescription("");setFormError("");requestKey.current=crypto.randomUUID();setUploadOpen(true);};
  const chooseFile=(next:File|undefined)=>{if(!next)return;const ext="."+next.name.split(".").pop()?.toLowerCase();if(!accept[uploadKind].split(",").includes(ext)){setFormError("这个分类暂不支持该格式，请选择提示中的文件类型。");return;}setFile(next);if(!title)setTitle(next.name.replace(/\.[^.]+$/,""));setFormError("");requestKey.current=crypto.randomUUID();};
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!file){setFormError("请先选择一个文件。");return;}setSaving(true);setFormError("");setUploadProgress(0);setUploadStage("正在上传原文件");const controller=new AbortController();uploadAbort.current=controller;try{const id=await uploadFile(file,uploadKind,title,description,requestKey.current,controller.signal,setUploadProgress);if(uploadKind==="photo"){setUploadStage("原图已保存，正在生成预览");const previewSaved=await savePhotoPreview(file,id);if(!previewSaved)toast.info("原图已保存，预览暂时使用原图。");}setUploadOpen(false);setTab(uploadKind);toast.success(`${kindLabels[uploadKind]}已保存`);await load();}catch(e){if(e instanceof Error&&e.name==="AbortError"){setFormError("上传已取消，文件和填写内容已保留。");requestKey.current=crypto.randomUUID();}else setFormError(e instanceof Error?e.message:"保存失败，请重试。");}finally{setSaving(false);uploadAbort.current=null;}};
  const remove=async()=>{if(!deleteItem)return;setDeleting(true);try{await readResponse(await fetch(`/api/library/${deleteItem.id}`,{method:"DELETE"}));setDeleteItem(null);setDetail(null);toast.success("已删除");await load();}catch(e){toast.error(e instanceof Error?e.message:"删除失败，请重试");}finally{setDeleting(false);}};
  const showEmpty=(kind:Kind)=><Empty className="empty-state"><EmptyHeader>{kind==="code"?<Code2 size={28}/>:kind==="novel"?<BookOpen size={28}/>:<Images size={28}/>}<EmptyTitle>{kind==="novel"?"把你的故事，放上书架":kind==="code"?"留住每一次灵感实现":"你的第一张照片，从这里开始"}</EmptyTitle><EmptyDescription>{kind==="novel"?"上传自己的小说，随时打开继续阅读。":kind==="code"?"上传代码文件，在线查看、复制或下载。":"上传生活片段，让相册慢慢丰富起来。"}</EmptyDescription></EmptyHeader><button className="primary-button" onClick={()=>beginUpload(kind)}><Plus size={16}/>上传{kindLabels[kind]}</button></Empty>;
  const photoItems=useMemo(()=>{const photos=items.filter(x=>x.kind==="photo");return photos.length?photos:samples;},[items]);
  const currentPhotoIndex=detail?.kind==="photo"?photoItems.findIndex(item=>item.id===detail.id):-1;
  const movePhoto=(direction:number)=>{
    if(currentPhotoIndex<0)return;
    const index=(currentPhotoIndex+direction+photoItems.length)%photoItems.length;
    setDetail(photoItems[index]);
  };
  useEffect(()=>{
    if(!detail||detail.kind!=="photo"||deleteItem)return;
    const onKey=(event:KeyboardEvent)=>{
      if(event.target instanceof HTMLElement&&event.target.closest("input,textarea,select,[contenteditable]"))return;
      if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;
      event.preventDefault();
      const index=photoItems.findIndex(item=>item.id===detail.id);
      setDetail(photoItems[(index+(event.key==="ArrowLeft"?-1:1)+photoItems.length)%photoItems.length]);
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[detail,photoItems,deleteItem]);
  const intro=<section className="intro">
    <p className="eyebrow">MY LITTLE CORNER / 01</p>
    <h1><span className="title-line"><span>生活与</span></span><span className="title-line"><span>创作的存档。</span></span></h1>
    <p className="intro-description">一些眼中的风景，一些脑海里的想法。</p>
    <div className="profile">
      <h2>我的个人空间</h2><p>拍照 · 写代码 · 写故事</p>
      <div className="profile-counts"><div><b>{items.length}</b><span>件作品</span></div><div><b>{days.filter(d=>d.visits+d.uploads>0).length}</b><span>天活跃</span></div></div>
    </div>
  </section>;
  const photoCard=(item:Item,index:number,featured=false)=><MotionPhoto featured={featured} source={item.url||`/api/library/${item.id}${item.has_preview?"?preview=1":""}`} index={index} key={item.id}>
    <button className="photo-button" onClick={()=>openDetail(item)} aria-label={`查看${item.title}`}>
      <span className="photo-image-motion"><img src={item.url||`/api/library/${item.id}${item.has_preview?"?preview=1":""}`} alt={item.title} loading={featured?"eager":"lazy"} fetchPriority={featured?"high":"auto"}/></span>
      <span className="photo-light-wash" aria-hidden="true"/><span className="photo-sheen" aria-hidden="true"/>
      {item.sample&&<span className="sample-label">展示样片</span>}
      <span className="image-expand" aria-hidden="true"><Maximize2 size={19} strokeWidth={1.5}/></span>
    </button>
    <div className="photo-caption"><h3><span className="photo-number">{String(index+1).padStart(2,"0")}</span><span className="caption-dash" aria-hidden="true">—</span>{item.title}</h3><span className="muted-small">{item.sample?"展示样片":dateLabel(item.created_at)}</span></div>
  </MotionPhoto>;
  return <GalleryScene><TooltipProvider delayDuration={150}><Toaster position="top-center" theme="dark"/>
    <a className="skip-link" href="#archive-main">跳到作品</a>
    <Tabs value={tab} onValueChange={v=>setTab(v as Kind)} className="archive-tabs">
      <header className="topbar"><div className="topbar-inner">
        <a href="/" className="brand" aria-label="片刻首页"><Aperture className="brand-icon" size={36} strokeWidth={1.5}/><span>片刻</span><small>A PERSONAL SPACE</small></a>
        <TabsList className="main-navigation" aria-label="作品分类">{(["photo","code","novel"] as Kind[]).map(kind=><TabsTrigger key={kind} value={kind}>{kindLabels[kind]}</TabsTrigger>)}</TabsList>
        <div className="header-actions"><button className="private-button" onClick={()=>setSpaceOpen(true)}><LockKeyhole size={16} strokeWidth={1.5}/><span>我的私人空间</span></button><button className="primary-button" onClick={()=>beginUpload(tab)}><Plus size={18} strokeWidth={1.5}/>上传作品</button></div>
      </div></header>
      <main className="main" id="archive-main" tabIndex={-1}>
        {loadError&&<div className="error-banner" role="alert"><span>{loadError}</span><button className="secondary-button" onClick={()=>void load()}>重试</button></div>}
        <TabsContent value="photo" className="archive-panel">
          <div className="gallery-hero">{intro}{loading?<Skeleton className="photo-skeleton"/>:photoItems[0]?photoCard(photoItems[0],0,true):showEmpty("photo")}</div>
          {!loading&&photoItems.length>1&&<section className="collection" aria-labelledby="photos-heading"><div className="gallery-heading"><h2 id="photos-heading">镜头里的片刻</h2>{counts.photo>0&&<span className="muted-small">{counts.photo} 张照片</span>}</div><div className="photo-grid">{photoItems.slice(1).map((item,index)=>photoCard(item,index+1))}</div></section>}
        </TabsContent>
        <TabsContent value="code" className="archive-panel"><div className="gallery-hero text-gallery">{intro}<section className="text-collection" aria-labelledby="code-heading"><div className="gallery-heading"><h2 id="code-heading">代码，也是一种表达</h2><span className="muted-small">{counts.code} 个文件</span></div>{loading?<Skeleton className="photo-skeleton"/>:counts.code?<div className="code-list">{items.filter(x=>x.kind==="code").map((item,index)=><button className="code-card" key={item.id} onClick={()=>openDetail(item)}><span className="list-number">{String(index+1).padStart(2,"0")}</span><div className="code-summary"><div className="code-card-head"><Code2 size={20}/><h3>{item.title}</h3></div><p>{item.description||item.filename}</p><footer><span>{item.language.toUpperCase()} · {sizeLabel(item.size)}</span><span>{dateLabel(item.created_at)}</span></footer></div><ArrowUpRight size={20} strokeWidth={1.5}/></button>)}</div>:showEmpty("code")}</section></div></TabsContent>
        <TabsContent value="novel" className="archive-panel"><div className="gallery-hero text-gallery">{intro}<section className="text-collection" aria-labelledby="novel-heading"><div className="gallery-heading"><h2 id="novel-heading">我的故事书架</h2><span className="muted-small">{counts.novel} 部作品</span></div>{loading?<Skeleton className="photo-skeleton"/>:counts.novel?<div className="book-list">{items.filter(x=>x.kind==="novel").map((item,index)=><button className="book" key={item.id} onClick={()=>openDetail(item)}><span className="list-number">{String(index+1).padStart(2,"0")}</span><div className="book-summary"><small>PERSONAL LIBRARY</small><h3>{item.title}</h3><p>{item.description||"打开故事，继续阅读。"}</p><span className="muted-small">{dateLabel(item.created_at)} · {sizeLabel(item.size)}</span></div><BookOpen size={24} strokeWidth={1.3}/></button>)}</div>:showEmpty("novel")}</section></div></TabsContent>
        <Collapsible open={activityOpen} onOpenChange={setActivityOpen} className="activity-panel">
          <div className="activity-summary"><CollapsibleTrigger className="activity-toggle"><ChevronRight size={17} strokeWidth={1.7}/><span>创作足迹</span></CollapsibleTrigger><span className="activity-total">{days.reduce((sum,d)=>sum+d.visits+d.uploads,0)} 次活动，活跃了 {days.filter(d=>d.visits+d.uploads>0).length} 天</span><span className="activity-explanation">每日首次访问 +1，每次上传 +1</span><time dateTime={today}>{today.replaceAll("-"," / ")} · 北京时间</time></div>
          <CollapsibleContent className="activity-content"><ActivityGrid days={days} loading={loading} today={today}/></CollapsibleContent>
        </Collapsible>
      </main>
    </Tabs>
    <footer className="footer"><span>片刻 · 留下属于自己的痕迹</span><span>PHOTOS, CODE & STORIES.</span></footer>
    <Dialog open={spaceOpen} onOpenChange={setSpaceOpen}><DialogContent className="detail-dialog space-dialog"><DialogHeader><LockKeyhole size={25} strokeWidth={1.3}/><DialogTitle>我的私人空间</DialogTitle><DialogDescription>{signedIn?"你已登录。这里的作品只属于你。":"登录后，收藏自己的照片、代码与故事。"}</DialogDescription></DialogHeader><p className="space-description">原文件完整保存，创作记录按天累积。{signedIn?"上传一件作品，让这个空间慢慢丰富起来。":"使用同一个账号登录，即可再次找到你的作品。"}</p>{signedIn?<button className="primary-button" onClick={()=>{setSpaceOpen(false);beginUpload(tab);}}><Plus size={17}/>上传作品</button>:<a href="/signin-with-chatgpt?return_to=%2F" target="_top" className="primary-button">使用 ChatGPT 登录<ArrowUpRight size={16}/></a>}</DialogContent></Dialog>
    <Dialog open={uploadOpen} onOpenChange={v=>{if(!saving)setUploadOpen(v);}}><DialogContent className="detail-dialog"><DialogHeader><DialogTitle>上传{kindLabels[uploadKind]}</DialogTitle><DialogDescription>保存到你的个人空间，下次访问仍然可以找到。</DialogDescription></DialogHeader>{!signedIn?<><p>登录后即可上传，并自动记录每天的使用情况。</p><a href="/signin-with-chatgpt?return_to=%2F" target="_top" className="primary-button">使用 ChatGPT 登录</a></>:<form className="form-stack" onSubmit={submit}><Tabs value={uploadKind} onValueChange={v=>{setUploadKind(v as Kind);setFile(null);setFormError("");requestKey.current=crypto.randomUUID();}}><TabsList aria-label="上传类型">{(["photo","code","novel"] as Kind[]).map(k=><TabsTrigger key={k} value={k} disabled={saving}>{kindLabels[k]}</TabsTrigger>)}</TabsList></Tabs><label className={`dropzone ${dragging?"dragging":""}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);if(!saving)chooseFile(e.dataTransfer.files[0]);}}><Upload size={28}/><span className={file?"file-ready":""}>{file?`${file.name} · ${sizeLabel(file.size)}`:"点击选择，或把文件拖到这里"}</span><small>{hint[uploadKind]}</small><input type="file" key={uploadKind} accept={accept[uploadKind]} onChange={e=>chooseFile(e.target.files?.[0])} aria-label={`选择${kindLabels[uploadKind]}文件`} disabled={saving}/></label><label className="form-field">作品名称<input className="text-input" required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="给这个作品取个名字" disabled={saving}/></label><label className="form-field">简介 <span className="muted-small">可选</span><textarea className="text-input" maxLength={500} rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="写下一点背景，留给以后的自己。" disabled={saving}/></label>{saving&&<div aria-live="polite"><div className="detail-meta">{uploadStage} · {uploadProgress}%</div><Progress value={uploadProgress} aria-label="文件上传进度" className="mt-2"/>{uploadProgress<100&&<button type="button" className="secondary-button mt-3" onClick={()=>uploadAbort.current?.abort()}>取消上传</button>}</div>}{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={()=>setUploadOpen(false)} disabled={saving}>取消</button><button type="submit" className="primary-button" disabled={saving}>{saving?"正在上传并保存…":<><Upload size={16}/>保存作品</>}</button></div></form>}</DialogContent></Dialog>
    <Dialog open={!!detail} onOpenChange={v=>{if(!v)setDetail(null);}}><DialogContent ref={detailDialogRef} tabIndex={-1} onOpenAutoFocus={event=>{event.preventDefault();detailDialogRef.current?.focus();}} onCloseAutoFocus={event=>{event.preventDefault();detailTrigger.current?.focus();}} className={`detail-dialog ${detail?.kind==="photo"?"photo-dialog":"reading-dialog"}`}><DialogHeader><DialogTitle>{detail?.title}</DialogTitle><DialogDescription>{detail?.description||detail?.filename||"展示样片"}</DialogDescription></DialogHeader>{detail?.kind==="photo"?<div className="lightbox"><img className="detail-image" src={detail.url||`/api/library/${detail.id}${detail.has_preview?"?preview=1":""}`} alt={detail.title}/>{photoItems.length>1&&<div className="lightbox-controls"><button className="icon-button" aria-label="上一张照片" onClick={()=>movePhoto(-1)}><ChevronLeft size={22}/></button><span aria-live="polite">{String(currentPhotoIndex+1).padStart(2,"0")} / {String(photoItems.length).padStart(2,"0")}</span><button className="icon-button" aria-label="下一张照片" onClick={()=>movePhoto(1)}><ChevronRight size={22}/></button></div>}</div>:detail?.filename.toLowerCase().endsWith(".zip")?<p>这是一个代码压缩包，下载后可以查看全部文件。</p>:detailLoading?<Skeleton className="h-60 w-full"/>:detailError?<p role="alert" className="form-error">{detailError}</p>:detail?.kind==="novel"?<article className="reader">{text}</article>:<pre className="code-view"><code>{text}</code></pre>}{detail&&detail.kind!=="photo"&&!detail.filename.toLowerCase().endsWith(".zip")&&!detailLoading&&!detailError&&<Pagination aria-label="阅读分页"><PaginationContent><PaginationItem><button className="secondary-button" disabled={!previousOffsets.length} onClick={()=>{setReadOffset(previousOffsets[previousOffsets.length-1]);setPreviousOffsets(previousOffsets.slice(0,-1));}}>上一段</button></PaginationItem><PaginationItem><span className="detail-meta">第 {previousOffsets.length+1} 段</span></PaginationItem><PaginationItem><button className="secondary-button" disabled={nextOffset===null} onClick={()=>{if(nextOffset!==null){setPreviousOffsets([...previousOffsets,readOffset]);setReadOffset(nextOffset);}}}>下一段</button></PaginationItem></PaginationContent></Pagination>}{detail&&!detail.sample&&<div className="detail-actions"><a className="secondary-button" href={`/api/library/${detail.id}?download=1`} download={detail.filename}><Download size={15}/>下载原文件</a>{detail.kind==="code"&&text&&<button className="secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{toast.error("无法复制，请下载文件。");}}}>{copied?<Check size={15}/>:<Copy size={15}/>}{copied?"已复制":"复制本段"}</button>}<button className="secondary-button danger" onClick={()=>setDeleteItem(detail)}><Trash2 size={15}/>删除</button></div>}{detail?.sample&&<p className="detail-meta">展示样片 · AI 生成。上传你的照片后，样片会自动让位。</p>}</DialogContent></Dialog>
    <AlertDialog open={!!deleteItem} onOpenChange={v=>{if(!v&&!deleting)setDeleteItem(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除「{deleteItem?.title}」？</AlertDialogTitle><AlertDialogDescription>文件会从个人空间中移除，无法撤销。已记录的活跃次数会保留。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>保留</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={e=>{e.preventDefault();void remove();}}>{deleting?"正在删除…":"确认删除"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </TooltipProvider></GalleryScene>;
}


