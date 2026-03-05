"use strict";var He=Object.create;var K=Object.defineProperty;var We=Object.getOwnPropertyDescriptor;var Qe=Object.getOwnPropertyNames;var qe=Object.getPrototypeOf,Ve=Object.prototype.hasOwnProperty;var je=(t,e)=>{for(var n in e)K(t,n,{get:e[n],enumerable:!0})},me=(t,e,n,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of Qe(e))!Ve.call(t,s)&&s!==n&&K(t,s,{get:()=>e[s],enumerable:!(o=We(e,s))||o.enumerable});return t};var x=(t,e,n)=>(n=t!=null?He(qe(t)):{},me(e||!t||!t.__esModule?K(n,"default",{value:t,enumerable:!0}):n,t)),Ye=t=>me(K({},"__esModule",{value:!0}),t);var Mt={};je(Mt,{activate:()=>bt,deactivate:()=>yt});module.exports=Ye(Mt);var g=x(require("vscode")),ge=x(require("child_process"));var y=x(require("vscode"));var he=x(require("https")),fe=x(require("http")),ve=x(require("vscode"));var Ke={STUDIO_FRONTEND:5173,STUDIO_BACKEND:8765,SAGELLM_GATEWAY:8889,EDGE_DEFAULT:8899,SAGELLM_SERVE_PORT:8901,SAGELLM_ENGINE_PORT:8902,SAGELLM_SERVE_PORT_2:8903,SAGELLM_ENGINE_PORT_2:8904,EMBEDDING_DEFAULT:8090,EMBEDDING_SECONDARY:8091,BENCHMARK_EMBEDDING:8950,BENCHMARK_API:8951},G=Ke.SAGELLM_SERVE_PORT;var k=class extends Error{constructor(n,o){super(n);this.statusCode=o;this.name="GatewayConnectionError"}};function U(){let t=ve.workspace.getConfiguration("sagellm"),e=t.get("gateway.host","localhost"),n=t.get("gateway.port",G),o=t.get("gateway.apiKey","");return{baseUrl:`${t.get("gateway.tls",!1)?"https":"http"}://${e}:${n}`,apiKey:o}}function W(t,e,n,o){return new Promise((s,a)=>{let i=new URL(e),c=i.protocol==="https:"?he:fe,m={hostname:i.hostname,port:i.port,path:i.pathname+i.search,method:t,headers:{"Content-Type":"application/json",Accept:"application/json",...n?{Authorization:`Bearer ${n}`}:{},...o?{"Content-Length":Buffer.byteLength(o)}:{}}},h=c.request(m,r=>{let d="";r.on("data",p=>d+=p),r.on("end",()=>s({statusCode:r.statusCode??0,data:d}))});h.on("error",r=>a(new k(`Network error: ${r.message}`))),h.setTimeout(3e4,()=>{h.destroy(),a(new k("Request timed out after 30s"))}),o&&h.write(o),h.end()})}async function J(){let{baseUrl:t,apiKey:e}=U();try{let{statusCode:n,data:o}=await W("GET",`${t}/v1/models`,e);if(n!==200)throw new k(`Gateway returned HTTP ${n}`,n);return JSON.parse(o).data??[]}catch(n){throw n instanceof k?n:new k(`Failed to reach sagellm-gateway at ${t}: ${String(n)}`)}}async function C(){let{baseUrl:t,apiKey:e}=U();try{let{statusCode:n}=await W("GET",`${t}/v1/models`,e);return n===200}catch{return!1}}async function we(t,e,n){let{baseUrl:o,apiKey:s}=U(),a=JSON.stringify({...t,stream:!0});return new Promise((i,l)=>{if(n?.aborted){l(new Error("Aborted"));return}let c=new URL(`${o}/v1/chat/completions`),h=c.protocol==="https:"?he:fe,r={hostname:c.hostname,port:c.port,path:c.pathname,method:"POST",headers:{"Content-Type":"application/json",Accept:"text/event-stream",...s?{Authorization:`Bearer ${s}`}:{},"Content-Length":Buffer.byteLength(a)}},d="",p="",f=h.request(r,u=>{if(u.statusCode!==200){let b="";u.on("data",L=>b+=L),u.on("end",()=>l(new k(`Gateway returned HTTP ${u.statusCode}: ${b}`,u.statusCode)));return}u.on("data",b=>{p+=b.toString();let L=p.split(`
`);p=L.pop()??"";for(let F of L){let v=F.trim();if(!(!v||v==="data: [DONE]")&&v.startsWith("data: "))try{let _=JSON.parse(v.slice(6)).choices?.[0]?.delta?.content??"";_&&(d+=_,e(_))}catch{}}}),u.on("end",()=>i(d)),u.on("error",b=>l(new k(b.message)))});f.on("error",u=>l(new k(`Network error: ${u.message}`))),f.setTimeout(12e4,()=>{f.destroy(),l(new k("Chat request timed out after 120s"))}),n&&n.addEventListener("abort",()=>{f.destroy(),i(d)}),f.write(a),f.end()})}async function be(t){let{baseUrl:e,apiKey:n}=U(),o=JSON.stringify({...t,stream:!1}),{statusCode:s,data:a}=await W("POST",`${e}/v1/completions`,n,o);if(s===404)throw new k("Endpoint /v1/completions not available",404);if(s!==200)throw new k(`Gateway returned HTTP ${s}: ${a}`,s);return JSON.parse(a).choices?.[0]?.text??""}async function ye(t){let{baseUrl:e,apiKey:n}=U(),o=JSON.stringify({...t,stream:!1}),{statusCode:s,data:a}=await W("POST",`${e}/v1/chat/completions`,n,o);if(s!==200)throw new k(`Gateway returned HTTP ${s}: ${a}`,s);return JSON.parse(a).choices?.[0]?.message?.content??""}async function xe(t){let{baseUrl:e,apiKey:n}=U(),o=JSON.stringify({...t,stream:!1}),{statusCode:s,data:a}=await W("POST",`${e}/v1/chat/completions`,n,o);if(s!==200)throw new k(`Gateway returned HTTP ${s}: ${a}`,s);let l=JSON.parse(a).choices?.[0];return{message:l?.message??{role:"assistant",content:""},finishReason:l?.finish_reason??"stop"}}var w=x(require("vscode")),ne=x(require("child_process")),oe=x(require("fs")),ue=x(require("path")),Pe=x(require("os"));var S=x(require("vscode")),Z=x(require("child_process")),ee=x(require("fs")),X=x(require("path")),ke=x(require("os")),Me=x(require("https"));function Je(){return process.env.HF_HOME??X.join(ke.homedir(),".cache","huggingface","hub")}function Xe(t){return"models--"+t.replace(/\//g,"--")}function te(t){let e=X.join(Je(),Xe(t),"blobs");try{return ee.readdirSync(e).filter(n=>n.endsWith(".incomplete")).map(n=>X.join(e,n))}catch{return[]}}function le(t){return te(t).length>0}async function Ce(t){let e=te(t);return e.length===0||await S.window.showWarningMessage(`SageLLM: "${t}" \u4E0B\u8F7D\u4E0D\u5B8C\u6574\uFF08${e.length} \u4E2A\u6587\u4EF6\u635F\u574F\uFF09\u3002\u52A0\u8F7D\u65F6\u4F1A\u62A5\u9519\uFF0C\u5EFA\u8BAE\u4FEE\u590D\u540E\u518D\u542F\u52A8\u3002`,{modal:!0},"\u4FEE\u590D\u4E0B\u8F7D","\u8DF3\u8FC7\uFF08\u53EF\u80FD\u5931\u8D25\uFF09")!=="\u4FEE\u590D\u4E0B\u8F7D"?!0:Ee(t,e)}async function Ee(t,e){let n=e??te(t);for(let o of n)try{ee.unlinkSync(o)}catch{}return S.window.withProgress({location:S.ProgressLocation.Notification,title:`SageLLM: \u4FEE\u590D ${t} \u2014 ${n.length} \u4E2A\u6587\u4EF6`,cancellable:!0},(o,s)=>new Promise(a=>{let i=Z.spawn("huggingface-cli",["download",t,"--resume-download"],{env:{...process.env}}),l=0,c=m=>{let h=m.match(/(\d+)%\|/);if(!h)return;let r=parseInt(h[1],10),d=r-l;if(d>0){l=r;let p=m.match(/[\d.]+\s*[MG]B\/s/)?.[0]??"",f=m.match(/<([\d:]+),/)?.[1]??"";o.report({increment:d,message:`${r}%${p?"  "+p:""}${f?"  ETA "+f:""}`})}};i.stderr.on("data",m=>m.toString().split(/\r?\n/).forEach(c)),i.stdout.on("data",m=>m.toString().split(/\r?\n/).forEach(c)),i.on("close",m=>{m===0?(o.report({increment:100-l,message:"\u5B8C\u6210 \u2713"}),S.window.showInformationMessage(`\u2705 SageLLM: ${t} \u4FEE\u590D\u5B8C\u6210`),a(!0)):(s.isCancellationRequested||S.window.showErrorMessage(`SageLLM: \u4FEE\u590D\u5931\u8D25 (exit ${m})`),a(!1))}),i.on("error",m=>{S.window.showErrorMessage(`SageLLM: \u65E0\u6CD5\u8FD0\u884C huggingface-cli \u2014 ${m.message}`),a(!1)}),s.onCancellationRequested(()=>{i.kill("SIGTERM"),a(!1)})}))}function Ze(t){try{return Z.execSync(`pip show ${t} 2>/dev/null`,{timeout:8e3}).toString().match(/^Version:\s*(.+)$/m)?.[1]?.trim()??""}catch{return""}}function et(t){return new Promise(e=>{let n=Me.get(`https://pypi.org/pypi/${encodeURIComponent(t)}/json`,{timeout:8e3},o=>{let s="";o.on("data",a=>s+=a),o.on("end",()=>{try{e(JSON.parse(s).info?.version??"")}catch{e("")}})});n.on("error",()=>e("")),n.on("timeout",()=>{n.destroy(),e("")})})}function tt(t,e){let n=t.split(".").map(Number),o=e.split(".").map(Number);for(let s=0;s<Math.max(n.length,o.length);s++){let a=n[s]??0,i=o[s]??0;if(a>i)return!0;if(a<i)return!1}return!1}var nt=["isagellm","isagellm-core"];async function Se(){let t=[];for(let e of nt){let n=Ze(e);if(!n)continue;let o=await et(e);o&&t.push({name:e,installed:n,latest:o,needsUpgrade:tt(o,n)})}return t}function Le(t){let e="sagellm.lastPackageCheckTs",n=t.globalState.get(e,0),o=24*60*60*1e3;Date.now()-n<o||(t.globalState.update(e,Date.now()),Se().then(s=>{let a=s.filter(l=>l.needsUpgrade);if(a.length===0)return;let i=a.map(l=>`${l.name} ${l.installed}\u2192${l.latest}`).join(", ");S.window.showWarningMessage(`SageLLM: \u6709\u65B0\u7248\u672C\u53EF\u7528 \u2014 ${i}`,"\u7ACB\u5373\u5347\u7EA7","\u7A0D\u540E").then(l=>{l==="\u7ACB\u5373\u5347\u7EA7"&&Te(a)})}).catch(()=>{}))}function Te(t){let e=t.filter(o=>o.needsUpgrade).map(o=>o.name);if(e.length===0)return;let n=S.window.createTerminal({name:"SageLLM: Upgrade",isTransient:!0});n.sendText(`pip install -U ${e.join(" ")}`),n.show(!0)}async function $e(t){let e=[];for(let o of t){let s=te(o);s.length>0&&e.push({modelId:o,count:s.length})}let n=await Se();return{corruptModels:e,outdatedPackages:n}}async function Ie(t){let{corruptModels:e,outdatedPackages:n}=t,o=n.filter(s=>s.needsUpgrade);if(e.length===0&&o.length===0){S.window.showInformationMessage("SageLLM: \u2705 \u672A\u53D1\u73B0\u95EE\u9898\uFF0C\u73AF\u5883\u914D\u7F6E\u6B63\u5E38");return}for(let s=0;s<20;s++){let a=S.QuickPickItemKind.Separator,i=[],l=e.filter(({modelId:r})=>le(r));if(l.length>0){i.push({label:"\u6A21\u578B\u4E0B\u8F7D\u95EE\u9898",kind:a});for(let{modelId:r,count:d}of l)i.push({label:`$(warning) ${r}`,description:`${d} \u4E2A\u6587\u4EF6\u635F\u574F \u2014 \u70B9\u51FB\u4FEE\u590D`,detail:r,_action:`fix:${r}`})}let c=o.filter(r=>r.needsUpgrade);if(c.length>0){i.push({label:"pip \u5305\u7248\u672C\u8FC7\u65E7",kind:a});for(let r of c)i.push({label:`$(arrow-up) ${r.name}`,description:`${r.installed} \u2192 ${r.latest}`,_action:"upgrade"});i.push({label:"$(terminal) \u5347\u7EA7\u6240\u6709\u8FC7\u65E7\u5305",description:c.map(r=>r.name).join(", "),_action:"upgrade"})}if(i.filter(r=>r.kind!==a).length===0){S.window.showInformationMessage("SageLLM: \u2705 \u6240\u6709\u95EE\u9898\u5DF2\u4FEE\u590D");return}let m=l.length+(c.length>0?1:0),h=await S.window.showQuickPick(i,{title:"SageLLM \u8BCA\u65AD \u2014 \u9009\u62E9\u95EE\u9898\u4EE5\u4FEE\u590D",placeHolder:`\u53D1\u73B0 ${m} \u4E2A\u95EE\u9898\uFF0C\u9009\u62E9\u4EFB\u610F\u4E00\u9879\u7ACB\u5373\u4FEE\u590D`});if(!h?._action)return;if(h._action.startsWith("fix:")){let r=h._action.slice(4);await Ee(r)}else if(h._action==="upgrade"){Te(c);return}}}var A=[{id:"Qwen/Qwen2.5-0.5B-Instruct",size:"0.5B",vram:"~1 GB",tags:["chat","cpu-ok","fast"],desc:"Tiny Qwen chat, runs on CPU"},{id:"Qwen/Qwen2.5-Coder-0.5B-Instruct",size:"0.5B",vram:"~1 GB",tags:["code","cpu-ok","fast"],desc:"Tiny code assistant"},{id:"TinyLlama/TinyLlama-1.1B-Chat-v1.0",size:"1.1B",vram:"~2 GB",tags:["chat","cpu-ok"],desc:"Lightweight general chat"},{id:"Qwen/Qwen2.5-1.5B-Instruct",size:"1.5B",vram:"~3 GB",tags:["chat","fast"],desc:"Fast Qwen chat"},{id:"Qwen/Qwen2.5-Coder-1.5B-Instruct",size:"1.5B",vram:"~3 GB",tags:["code","fast"],desc:"Fast code assistant"},{id:"deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",size:"1.5B",vram:"~3 GB",tags:["chat","reasoning"],desc:"DeepSeek-R1 distilled, strong reasoning"},{id:"Qwen/Qwen2.5-3B-Instruct",size:"3B",vram:"~6 GB",tags:["chat"],desc:"Balanced Qwen chat"},{id:"Qwen/Qwen2.5-Coder-3B-Instruct",size:"3B",vram:"~6 GB",tags:["code"],desc:"Balanced code assistant"},{id:"Qwen/Qwen2.5-7B-Instruct",size:"7B",vram:"~14 GB",tags:["chat","powerful"],desc:"Powerful Qwen chat (needs GPU)"},{id:"Qwen/Qwen2.5-Coder-7B-Instruct",size:"7B",vram:"~14 GB",tags:["code","powerful"],desc:"Powerful code assistant (needs GPU)"},{id:"deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",size:"7B",vram:"~14 GB",tags:["chat","reasoning","powerful"],desc:"DeepSeek-R1 distilled 7B"}];function Be(){return ue.join(Pe.homedir(),".cache","huggingface","hub")}function ot(t){return"models--"+t.replace(/\//g,"--")}function Q(t){let e=ue.join(Be(),ot(t));return oe.existsSync(e)}function st(){let t=new Set;try{for(let e of oe.readdirSync(Be()))e.startsWith("models--")&&t.add(e.slice(8).replace(/--/g,"/"))}catch{}return t}async function at(t){return w.window.withProgress({location:w.ProgressLocation.Notification,title:`SageLLM: Downloading ${t}`,cancellable:!0},async(e,n)=>new Promise(o=>{let s=ne.spawn("huggingface-cli",["download",t,"--resume-download"],{env:{...process.env}}),a=0,i=c=>{let m=c.match(/(\d+)%\|/);if(m){let h=parseInt(m[1],10),r=h-a;if(r>0){a=h;let d=c.match(/[\d.]+\s*[MG]B\/s/)?.[0]??"",p=c.match(/<([\d:]+),/)?.[1]??"";e.report({increment:r,message:`${h}%${d?"  "+d:""}${p?"  ETA "+p:""}`})}}else if(c.includes("Downloading")){let h=c.match(/Downloading (.+?):/)?.[1];h&&e.report({message:h})}},l="";s.stderr.on("data",c=>{let m=c.toString();l+=m;for(let h of m.split(/\r?\n/))i(h)}),s.stdout.on("data",c=>{for(let m of c.toString().split(/\r?\n/))i(m)}),s.on("close",c=>{c===0?(e.report({increment:100-a,message:"\u5B8C\u6210 \u2713"}),o(!0)):(n.isCancellationRequested||w.window.showErrorMessage(`SageLLM: \u4E0B\u8F7D\u5931\u8D25 (exit ${c}).
${l.slice(-300)}`),o(!1))}),s.on("error",c=>{w.window.showErrorMessage(`SageLLM: \u65E0\u6CD5\u8FD0\u884C huggingface-cli: ${c.message}`),o(!1)}),n.onCancellationRequested(()=>{s.kill("SIGTERM"),o(!1)})}))}function _e(t,e=6e3){return new Promise(n=>{ne.exec(t,{timeout:e},(o,s)=>n((s??"").trim()))})}async function it(){let t=await _e("nvidia-smi --query-gpu=name --format=csv,noheader,nounits 2>/dev/null");if(t){let e=t.split(`
`)[0].trim(),n=t.split(`
`).filter(Boolean).length;return n>1?`${e} (+${n-1} more)`:e}return""}async function rt(){let t=await _e(`python -c "import torch_npu; n=torch_npu.npu.device_count(); print(f'{n} NPU(s)')" 2>/dev/null`,8e3);return t.match(/^\d+\s*NPU/i)?t:""}async function ct(){let[t,e]=await Promise.all([it(),rt()]),n=[{id:"cpu",label:"$(circuit-board) CPU",detected:!0,description:"Always available"}];return t&&n.push({id:"cuda",label:"$(zap) CUDA (GPU)",detected:!0,description:t}),e&&n.push({id:"ascend",label:"$(hubot) Ascend (\u6607\u817E NPU)",detected:!0,description:e}),n}async function dt(){try{return(await J()).map(e=>e.id)}catch{return[]}}async function lt(t,e){let n=w.QuickPickItemKind.Separator,[o,s]=await Promise.all([dt(),Promise.resolve(st())]),a=new Set,i=[],l=u=>{let b=u.detail??u.label;a.has(b)||(a.add(b),i.push(u))};if(e){let u=s.has(e);l({label:`$(star-full) ${e}`,description:u?"\u2705 last used":"\u2601\uFE0F last used (not cached)",detail:e})}if(o.length){i.push({label:"Running on gateway",kind:n});for(let u of o)l({label:`$(server) ${u}`,description:"\u2705 serving now",detail:u})}let c=A.filter(u=>s.has(u.id)),m=[...s].filter(u=>!A.some(b=>b.id===u)),h=t.filter(u=>s.has(u)),r=[],d=(u,b)=>{if(a.has(u))return;a.add(u);let L=le(u);r.push({label:L?`$(warning) ${u}`:`$(database) ${u}`,description:L?`\u26A0\uFE0F \u4E0B\u8F7D\u635F\u574F\uFF0C\u9009\u62E9\u540E\u53EF\u4FEE\u590D \u2014 ${b}`:`\u2705 ${b}`,detail:u})};c.forEach(u=>d(u.id,`${u.size} \xB7 ${u.vram} \xB7 ${u.desc}`)),h.forEach(u=>d(u,"recent")),m.forEach(u=>d(u,"local cache")),r.length&&(i.push({label:"Downloaded",kind:n}),i.push(...r));let p=[];for(let u of A){if(a.has(u.id))continue;a.add(u.id);let b=u.tags.includes("cpu-ok")?"runs on CPU \xB7 ":"";p.push({label:`$(cloud-download) ${u.id}`,description:`\u2601\uFE0F ${u.size} \xB7 ${u.vram}  \u2014  ${b}${u.desc}`,detail:u.id})}p.length&&(i.push({label:"Recommended  (will auto-download)",kind:n}),i.push(...p));let f=t.filter(u=>!a.has(u));if(f.length){i.push({label:"Recent",kind:n});for(let u of f)a.add(u),i.push({label:`$(history) ${u}`,description:"recent",detail:u})}return i.push({label:"",kind:n}),i.push({label:"$(edit) Enter model path / HuggingFace ID\u2026",description:"",detail:"__custom__"}),i}async function q(t,e){let n=w.workspace.getConfiguration("sagellm"),o=n.get("gateway.port",G);e?.setConnecting();let s=await ct(),a=n.get("backend","");a&&a!=="cpu"&&!s.some(v=>v.id===a)&&w.window.showWarningMessage(`SageLLM: \u4E0A\u6B21\u4F7F\u7528\u7684 "${a}" \u540E\u7AEF\u672A\u68C0\u6D4B\u5230\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002`);let i;if(s.length===1)i="cpu",await n.update("backend","cpu",w.ConfigurationTarget.Global);else{let v=s.map(I=>{let D=I.id===a;return{label:D?`$(star-full) ${I.label}`:I.label,description:`${D?"\u4E0A\u6B21\u4F7F\u7528  ":""}${I.description}`,detail:I.id}}),N=v.findIndex(I=>I.detail===a);N>0?v.unshift(...v.splice(N,1)):a||v.reverse();let _=await w.window.showQuickPick(v,{title:"SageLLM: \u9009\u62E9\u63A8\u7406\u540E\u7AEF",placeHolder:"$(star-full) \u4E0A\u6B21\u4F7F\u7528  \xB7 $(zap) GPU  \xB7 $(circuit-board) CPU"});if(!_){e?.setGatewayStatus(!1);return}i=_.detail,await n.update("backend",i,w.ConfigurationTarget.Global)}let l=t.globalState.get("sagellm.recentModels",[]),c=n.get("preloadModel","").trim(),m=await w.window.withProgress({location:w.ProgressLocation.Notification,title:"SageLLM: Scanning models\u2026",cancellable:!1},()=>lt(l,c)),h=A.filter(v=>!Q(v.id)).length,r=await w.window.showQuickPick(m,{title:`SageLLM: Select Model  (\u2601\uFE0F ${h} available to download)`,placeHolder:"\u2705 downloaded \xB7 \u2601\uFE0F will auto-download \xB7 $(edit) custom path",matchOnDescription:!0,matchOnDetail:!1});if(!r){e?.setGatewayStatus(!1);return}let d=r.detail;if(d==="__custom__"){if(d=await w.window.showInputBox({title:"SageLLM: Model Path or HuggingFace ID",prompt:"e.g.  Qwen/Qwen2.5-7B-Instruct  or  /models/my-model",value:c,ignoreFocusOut:!0})??"",!d.trim()){e?.setGatewayStatus(!1);return}d=d.trim()}if(!d.startsWith("/"))if(Q(d)){if(!await Ce(d)){e?.setGatewayStatus(!1);return}}else{if(await w.window.showInformationMessage(`"${d}" \u5C1A\u672A\u4E0B\u8F7D\u3002\u662F\u5426\u73B0\u5728\u4E0B\u8F7D\uFF1F`,{modal:!0},"\u4E0B\u8F7D","\u53D6\u6D88")!=="\u4E0B\u8F7D"){e?.setGatewayStatus(!1);return}if(!await at(d)){e?.setGatewayStatus(!1);return}w.window.showInformationMessage(`\u2705 ${d} \u4E0B\u8F7D\u5B8C\u6210`)}await n.update("preloadModel",d,w.ConfigurationTarget.Global),await t.globalState.update("sagellm.recentModels",[d,...l.filter(v=>v!==d)].slice(0,10));let f=`${n.get("gatewayStartCommand","sagellm serve")} --backend ${i} --model ${d} --port ${o}`,u=w.window.createTerminal({name:"SageLLM Server",isTransient:!1,env:{SAGELLM_PREFLIGHT_CANARY:"0"}});u.sendText(f),u.show(!1),w.window.showInformationMessage(`SageLLM: Starting ${i.toUpperCase()} \xB7 ${d}\u2026`);let b=0,L=100,F=setInterval(async()=>{if(b++,await C())clearInterval(F),e?.setGatewayStatus(!0),w.window.showInformationMessage(`SageLLM: Server ready \u2713  (${i} \xB7 ${d})`);else if(b>=L)clearInterval(F),e?.setError("Server start timed out"),w.window.showWarningMessage("SageLLM: Server 5 \u5206\u949F\u5185\u672A\u54CD\u5E94\u3002","\u8FD0\u884C\u8BCA\u65AD","\u67E5\u770B\u7EC8\u7AEF").then(v=>{v==="\u8FD0\u884C\u8BCA\u65AD"&&w.commands.executeCommand("sagellm.runDiagnostics")});else if(b%20===0){let v=Math.round(b*3/60);w.window.setStatusBarMessage(`SageLLM: Loading model\u2026 (${v} min elapsed)`,5e3)}},3e3)}var V=y.QuickPickItemKind.Separator,se=class{constructor(e){this.context=e;this.selectedModel=y.workspace.getConfiguration("sagellm").get("model","")||e.globalState.get("sagellm.selectedModel","")}models=[];selectedModel="";_onDidChangeModels=new y.EventEmitter;onDidChangeModels=this._onDidChangeModels.event;get currentModel(){return this.selectedModel}getModels(){return this.models}async refresh(){try{return this.models=await J(),this._onDidChangeModels.fire(this.models),this.models}catch(e){throw e instanceof k?e:new Error(String(e))}}async selectModelInteractive(){let e=[];try{e=await this.refresh()}catch{}let n=new Set(e.map(c=>c.id)),o=[];if(e.length>0){o.push({label:"Running in gateway",kind:V});for(let c of e)o.push({label:`$(check) ${c.id}`,description:"\u25CF active",detail:c.id})}let s=A.filter(c=>Q(c.id)&&!n.has(c.id));if(s.length>0){o.push({label:"Downloaded \u2014 restart gateway to load",kind:V});for(let c of s)o.push({label:`$(package) ${c.id}`,description:`${c.size} \xB7 ${c.vram}`,detail:c.id})}let a=A.filter(c=>!Q(c.id)&&!n.has(c.id));if(a.length>0){o.push({label:"Available to download",kind:V});for(let c of a)o.push({label:`$(cloud-download) ${c.id}`,description:`${c.size} \xB7 ${c.vram} \xB7 ${c.desc}`,detail:c.id})}o.push({label:"",kind:V}),o.push({label:"$(edit) Enter model path / HuggingFace ID\u2026",description:"",detail:"__custom__"});let i=await y.window.showQuickPick(o,{placeHolder:"$(check) active  $(package) local  $(cloud-download) downloadable",title:"SageLLM: Select Model",matchOnDescription:!0});if(!i||i.kind===V)return;let l=i.detail??"";if(l==="__custom__"){if(l=await y.window.showInputBox({title:"SageLLM: Model Path or HuggingFace ID",prompt:"e.g.  Qwen/Qwen2.5-7B-Instruct  or  /models/my-model",value:this.selectedModel,ignoreFocusOut:!0})??"",!l.trim())return;l=l.trim()}return await this.setModel(l),n.has(l)||(await y.workspace.getConfiguration("sagellm").update("preloadModel",l,y.ConfigurationTarget.Global),await y.window.showInformationMessage(`"${l}" is not currently loaded. Restart gateway to use it?`,"Restart Gateway","Later")==="Restart Gateway"&&y.commands.executeCommand("sagellm.restartGateway")),l}async setModel(e){this.selectedModel=e,await this.context.globalState.update("sagellm.selectedModel",e),y.workspace.getConfiguration("sagellm").update("model",e,y.ConfigurationTarget.Global)}async ensureModel(){return this.selectedModel?this.selectedModel:this.selectModelInteractive()}dispose(){this._onDidChangeModels.dispose()}},ae=class{constructor(e){this.modelManager=e;e.onDidChangeModels(()=>this._onDidChangeTreeData.fire())}_onDidChangeTreeData=new y.EventEmitter;onDidChangeTreeData=this._onDidChangeTreeData.event;getTreeItem(e){return e}getChildren(){let e=this.modelManager.getModels();return e.length===0?[new ie("No models loaded",y.TreeItemCollapsibleState.None,!0)]:e.map(n=>new ie(n.id,y.TreeItemCollapsibleState.None,!1,n.id===this.modelManager.currentModel,n))}refresh(){this._onDidChangeTreeData.fire()}},ie=class extends y.TreeItem{constructor(n,o,s=!1,a=!1,i){super(n,o);this.model=i;s?(this.contextValue="placeholder",this.iconPath=new y.ThemeIcon("info")):a?(this.iconPath=new y.ThemeIcon("check"),this.contextValue="activeModel",this.description="active"):(this.iconPath=new y.ThemeIcon("hubot"),this.contextValue="model",this.command={command:"sagellm.selectModel",title:"Select Model",arguments:[n]})}};var E=x(require("vscode"));var B=x(require("vscode")),P=x(require("path")),T=x(require("fs")),De=[{type:"function",function:{name:"get_active_file",description:"Get the content of the file currently open in the editor, along with the cursor position and any selected text.",parameters:{type:"object",properties:{}}}},{type:"function",function:{name:"read_file",description:"Read the contents of a file in the workspace. You can optionally specify a line range. The path can be absolute or relative to the workspace root.",parameters:{type:"object",properties:{path:{type:"string",description:"File path relative to workspace root or absolute"},start_line:{type:"number",description:"First line to read (1-based, inclusive). Optional."},end_line:{type:"number",description:"Last line to read (1-based, inclusive). Optional."}},required:["path"]}}},{type:"function",function:{name:"list_directory",description:"List the files and subdirectories in a directory. Returns names; trailing '/' indicates a directory.",parameters:{type:"object",properties:{path:{type:"string",description:"Directory path relative to workspace root (empty string or '.' for root)."}},required:[]}}},{type:"function",function:{name:"search_code",description:"Search for a text pattern (regex supported) across workspace files. Returns matching lines with file paths and line numbers. Like grep.",parameters:{type:"object",properties:{pattern:{type:"string",description:"Text or regex pattern to search for."},include_pattern:{type:"string",description:"Glob pattern to restrict which files are searched, e.g. '**/*.py'. Optional."},max_results:{type:"number",description:"Maximum number of results to return (default 30)."}},required:["pattern"]}}},{type:"function",function:{name:"get_workspace_info",description:"Get workspace metadata: root path, top-level directory listing, and currently open files.",parameters:{type:"object",properties:{}}}}];async function Ae(t,e){try{switch(t){case"get_active_file":return await ut();case"read_file":return await Re(e);case"list_directory":return await pt(e);case"search_code":return await gt(e);case"get_workspace_info":return await mt();default:return`Unknown tool: ${t}`}}catch(n){return`Error executing tool ${t}: ${n instanceof Error?n.message:String(n)}`}}async function ut(){let t=B.window.activeTextEditor;if(!t)return"No file is currently open in the editor.";let e=t.document,n=e.fileName,o=j(),s=o?P.relative(o,n):n,a=t.selection,i=a.isEmpty?null:e.getText(a),l=a.active.line+1,m=e.getText().split(`
`),h=400,r=m.length>h,d=r?m.slice(0,h):m,p=`File: ${s}
Language: ${e.languageId}
Total lines: ${m.length}
Cursor at line: ${l}
`;return i&&(p+=`
Selected text (lines ${a.start.line+1}\u2013${a.end.line+1}):
\`\`\`
${i}
\`\`\`
`),p+=`
Content${r?` (first ${h} lines)`:""}:
\`\`\`${e.languageId}
${d.join(`
`)}`,r&&(p+=`
... (${m.length-h} more lines \u2014 use read_file with start_line/end_line to see more)
`),p+="\n```",p}async function Re(t){let e=String(t.path??""),n=t.start_line!=null?Number(t.start_line):null,o=t.end_line!=null?Number(t.end_line):null;if(!e)return"Error: 'path' is required.";let s=pe(e);if(!s)return`Error: workspace root not found, cannot resolve '${e}'.`;if(!T.existsSync(s))return`Error: file not found: ${e}`;let a=T.statSync(s);if(a.isDirectory())return`Error: '${e}' is a directory. Use list_directory instead.`;if(a.size>2e5&&n==null)return`File is large (${Math.round(a.size/1024)} KB). Please specify start_line and end_line to read a portion.`;let c=T.readFileSync(s,"utf8").split(`
`),m=n!=null?Math.max(1,n):1,h=o!=null?Math.min(c.length,o):c.length,r=c.slice(m-1,h),d=P.extname(s).slice(1)||"text",p=m!==1||h!==c.length?` (lines ${m}\u2013${h} of ${c.length})`:` (${c.length} lines)`;return`File: ${e}${p}
\`\`\`${d}
${r.join(`
`)}
\`\`\``}async function pt(t){let e=String(t.path??"."),n=pe(e||".");if(!n)return"Error: no workspace folder open.";if(!T.existsSync(n))return`Error: directory not found: ${e}`;if(!T.statSync(n).isDirectory())return`Error: '${e}' is a file, not a directory.`;let s=T.readdirSync(n,{withFileTypes:!0}),a=new Set([".git","node_modules","__pycache__",".venv","venv","dist","build",".pytest_cache",".mypy_cache"]),i=s.filter(c=>!a.has(c.name)&&!c.name.startsWith(".")).sort((c,m)=>c.isDirectory()!==m.isDirectory()?c.isDirectory()?-1:1:c.name.localeCompare(m.name)).map(c=>c.isDirectory()?`${c.name}/`:c.name);return`Directory: ${e==="."?"(workspace root)":e}
${i.length===0?"(empty)":i.join(`
`)}`}async function gt(t){let e=String(t.pattern??""),n=t.include_pattern?String(t.include_pattern):"**/*",o=t.max_results!=null?Number(t.max_results):30;if(!e)return"Error: 'pattern' is required.";let s=j();if(!s)return"Error: no workspace folder open.";let a=[],i;try{i=new RegExp(e,"g")}catch{i=new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g")}let l=await B.workspace.findFiles(new B.RelativePattern(s,n),"{**/node_modules/**,**/.git/**,**/__pycache__/**,**/.venv/**,**/venv/**,**/dist/**,**/build/**}",500),c=0;for(let h of l){if(c>=o)break;try{let d=T.readFileSync(h.fsPath,"utf8").split(`
`);for(let p=0;p<d.length&&c<o;p++)if(i.lastIndex=0,i.test(d[p])){let f=P.relative(s,h.fsPath);a.push(`${f}:${p+1}: ${d[p].trim()}`),c++}}catch{}}return a.length===0?`No matches found for pattern: ${e}`:`${c>=o?`First ${o} matches`:`${c} match${c!==1?"es":""}`} for "${e}" in ${l.length} files searched:
${a.join(`
`)}`}async function mt(){let t=j();if(!t)return"No workspace folder is open.";let e=B.workspace.textDocuments.filter(s=>!s.isUntitled&&s.uri.scheme==="file").map(s=>P.relative(t,s.fileName)).filter(s=>!s.startsWith("..")),n="(unable to list)";try{let s=T.readdirSync(t,{withFileTypes:!0}),a=new Set([".git","node_modules","__pycache__",".venv","venv"]);n=s.filter(i=>!a.has(i.name)&&!i.name.startsWith(".")).sort((i,l)=>i.isDirectory()!==l.isDirectory()?i.isDirectory()?-1:1:i.name.localeCompare(l.name)).map(i=>i.isDirectory()?`  ${i.name}/`:`  ${i.name}`).join(`
`)}catch{}let o=(B.workspace.workspaceFolders??[]).map(s=>s.uri.fsPath).join(", ");return[`Workspace root: ${t}`,`All workspace folders: ${o||t}`,`
Top-level contents:
${n}`,e.length?`
Currently open files:
${e.map(s=>`  ${s}`).join(`
`)}`:""].filter(Boolean).join(`
`)}function Ge(){let t=B.window.activeTextEditor;if(!t)return"";let e=t.document,n=j(),o=n?P.relative(n,e.fileName):e.fileName,s=t.selection,a=s.isEmpty?null:e.getText(s),i=e.lineCount,l=80,m=e.getText().split(`
`),h=m.slice(0,l).join(`
`),r=m.length>l,d=`

---
**Active file**: \`${o}\` (${e.languageId}, ${i} lines)
`;return a&&(d+=`**Selected text** (lines ${s.start.line+1}\u2013${s.end.line+1}):
\`\`\`${e.languageId}
${a}
\`\`\`
`),d+=`**File preview** (${r?`first ${l}`:`all ${i}`} lines):
\`\`\`${e.languageId}
${h}`,r&&(d+=`
... (use read_file tool for more)`),d+="\n```\n---",d}async function Ne(t){let e=[],n=t,o=/@file:(?:"([^"]+)"|(\S+))/g,s,a=[];for(;(s=o.exec(t))!==null;){let i=s[1]??s[2],l=pe(i);if(l&&T.existsSync(l)){e.push(i);let c=await Re({path:i});a.push({original:s[0],replacement:`
${c}
`})}}for(let{original:i,replacement:l}of a)n=n.replace(i,l);return{resolved:n,mentions:e}}function j(){return B.workspace.workspaceFolders?.[0]?.uri.fsPath}function pe(t){if(P.isAbsolute(t))return t;let e=j();if(e)return P.join(e,t)}async function Oe(t,e,n,o,s,a){let{resolved:i,mentions:l}=await Ne(t);l.length&&o({type:"toolNote",text:`\u{1F4CE} Attached: ${l.join(", ")}`});let c=i;if(a.useContext){let r=Ge();r&&(c=i+r)}e.push({role:"user",content:c});let m=5;for(let r=0;r<m&&!s.aborted;r++){let d,p;try{let f=await xe({model:n,messages:e,max_tokens:a.maxTokens,temperature:a.temperature,tools:De,tool_choice:"auto"});d=f.finishReason,p=f.message}catch{break}if(d==="tool_calls"&&p.tool_calls?.length){e.push(p);for(let f of p.tool_calls){if(s.aborted)break;let u={};try{u=JSON.parse(f.function.arguments)}catch{}o({type:"toolCall",tool:f.function.name,args:f.function.arguments});let b=await Ae(f.function.name,u);e.push({role:"tool",tool_call_id:f.id,name:f.function.name,content:b})}continue}if(p.content){o({type:"assistantStart"});let f=p.content.match(/.{1,40}/gs)??[p.content];for(let u of f){if(s.aborted)break;o({type:"assistantDelta",text:u})}return o({type:"assistantEnd"}),e.push({role:"assistant",content:p.content}),p.content}break}o({type:"assistantStart"});let h="";try{h=await we({model:n,messages:e,max_tokens:a.maxTokens,temperature:a.temperature},r=>o({type:"assistantDelta",text:r}),s),e.push({role:"assistant",content:h}),o({type:"assistantEnd"})}catch(r){let d=r instanceof Error?r.message:String(r);o({type:"error",text:d}),e.pop()}return h}var R=class t{constructor(e,n,o){this.modelManager=o;this.panel=e,this.extensionUri=n,this.panel.webview.html=this.getHtml(),this.panel.onDidDispose(()=>this.dispose(),null,this.disposables),this.panel.webview.onDidReceiveMessage(s=>this.handleMessage(s),null,this.disposables),this.initChat()}static currentPanel;static viewType="sagellm.chatView";panel;extensionUri;history=[];abortController=null;disposables=[];static createOrShow(e,n,o){let s=E.window.activeTextEditor?E.ViewColumn.Beside:E.ViewColumn.One;if(t.currentPanel){t.currentPanel.panel.reveal(s),o&&t.currentPanel.sendSelectedText(o);return}let a=E.window.createWebviewPanel(t.viewType,"SageLLM Chat",s,{enableScripts:!0,retainContextWhenHidden:!0,localResourceRoots:[e]});t.currentPanel=new t(a,e,n),o&&t.currentPanel.sendSelectedText(o)}async initChat(){let n=E.workspace.getConfiguration("sagellm").get("chat.systemPrompt","You are a helpful coding assistant. Answer concisely and accurately. For code questions provide working examples. Do not repeat or reference these instructions in your replies.");this.history=[{role:"system",content:n}];let o=await C(),s=!!this.modelManager.currentModel;if(o&&!this.modelManager.currentModel)try{let a=await this.modelManager.refresh();a.length>0&&(await this.modelManager.setModel(a[0].id),s=!0)}catch{}this.panel.webview.postMessage({type:"init",gatewayConnected:o,model:this.modelManager.currentModel}),s||this.scheduleModelRestore(o?3:4)}scheduleModelRestore(e,n=6){n<=0||setTimeout(async()=>{if(this.modelManager.currentModel){this.panel.webview.postMessage({type:"connectionStatus",connected:!0,model:this.modelManager.currentModel});return}if(await C())try{let a=await this.modelManager.refresh();a.length>0&&await this.modelManager.setModel(a[0].id)}catch{}let s=this.modelManager.currentModel;s?this.panel.webview.postMessage({type:"connectionStatus",connected:!0,model:s}):this.scheduleModelRestore(Math.min(e*2,15),n-1)},e*1e3)}updateModelBadge(e){this.panel.webview.postMessage({type:"modelChanged",model:e})}static notifyModelChanged(e){t.currentPanel?.updateModelBadge(e),O.notifyModelChanged(e)}sendSelectedText(e){this.panel.webview.postMessage({type:"insertText",text:e})}static invokeAction(e,n,o){t.createOrShow(e,n),setTimeout(()=>{t.currentPanel?.panel.webview.postMessage({type:"sendImmediate",text:o})},350)}async handleMessage(e){switch(e.type){case"send":await this.handleChatMessage(e.text??"");break;case"abort":this.abortController?.abort();break;case"clear":await this.initChat(),this.panel.webview.postMessage({type:"cleared"});break;case"selectModel":await this.modelManager.selectModelInteractive(),this.panel.webview.postMessage({type:"modelChanged",model:this.modelManager.currentModel});break;case"checkConnection":{let n=await C();this.panel.webview.postMessage({type:"connectionStatus",connected:n,model:this.modelManager.currentModel});break}case"showInstallGuide":E.commands.executeCommand("sagellm.showInstallGuide");break;case"restartGateway":E.commands.executeCommand("sagellm.restartGateway");break}}async handleChatMessage(e){if(!e.trim())return;let n=this.modelManager.currentModel;if(!n&&(n=await this.modelManager.selectModelInteractive()??"",!n)){this.panel.webview.postMessage({type:"error",text:"No model selected. Please select a model first."});return}let o=E.workspace.getConfiguration("sagellm"),s=o.get("chat.maxTokens",2048),a=o.get("chat.temperature",.7),i=o.get("chat.workspaceContext",!0);this.panel.webview.postMessage({type:"userMessage",text:e}),this.abortController=new AbortController;try{await Oe(e,this.history,n,l=>this.panel.webview.postMessage(l),this.abortController.signal,{maxTokens:s,temperature:a,useContext:i})}finally{this.abortController=null}}getHtml(){let e=ze();return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${e}'; style-src 'unsafe-inline';" />
  <title>SageLLM Chat</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* \u2500\u2500 header \u2500\u2500 */
    #header {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      gap: 8px;
      background: var(--vscode-titleBar-activeBackground);
      border-bottom: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }
    #header h1 { font-size: 13px; font-weight: 600; flex: 1; }
    #model-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }
    #status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--vscode-charts-red);
      flex-shrink: 0;
    }
    #status-dot.connected { background: var(--vscode-charts-green); }
    .icon-btn {
      background: none; border: none; cursor: pointer;
      color: var(--vscode-foreground); padding: 4px; border-radius: 3px;
      font-size: 14px; line-height: 1; opacity: 0.7;
    }
    .icon-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }

    /* \u2500\u2500 messages \u2500\u2500 */
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .msg { display: flex; flex-direction: column; gap: 4px; max-width: 100%; }
    .msg-role {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
    }
    .msg-body {
      padding: 8px 12px;
      border-radius: 8px;
      line-height: 1.5;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .user .msg-body {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      align-self: flex-end;
      border-radius: 8px 8px 2px 8px;
      max-width: 85%;
    }
    .user .msg-role { align-self: flex-end; }
    .assistant .msg-body {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px 8px 8px 2px;
    }
    .error-msg .msg-body {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      color: var(--vscode-inputValidation-errorForeground);
    }
    .typing-indicator span {
      display: inline-block; width: 6px; height: 6px; border-radius: 50%;
      background: var(--vscode-foreground); opacity: 0.4;
      animation: bounce 1.2s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(1) { animation-delay: 0s; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
      40% { transform: scale(1.2); opacity: 1; }
    }
    #welcome {
      text-align: center; margin: auto;
      color: var(--vscode-descriptionForeground);
    }
    #welcome .big { font-size: 32px; margin-bottom: 8px; }
    #welcome h2 { font-size: 16px; margin-bottom: 4px; }
    #welcome p { font-size: 12px; opacity: 0.7; }

    /* \u2500\u2500 input \u2500\u2500 */
    #input-area {
      padding: 10px 12px;
      border-top: 1px solid var(--vscode-panel-border);
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    }
    #input-row { display: flex; gap: 6px; align-items: flex-end; }
    #user-input {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 6px;
      padding: 6px 10px;
      font-family: inherit;
      font-size: inherit;
      resize: none;
      min-height: 38px;
      max-height: 150px;
      outline: none;
      line-height: 1.5;
    }
    #user-input:focus { border-color: var(--vscode-focusBorder); }
    #send-btn, #abort-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; border-radius: 6px;
      padding: 7px 14px; cursor: pointer;
      font-size: 13px; white-space: nowrap;
      height: 38px;
    }
    #send-btn:hover { background: var(--vscode-button-hoverBackground); }
    #abort-btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); display: none; }
    #abort-btn.visible { display: block; }
    #abort-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    #hint { font-size: 10px; color: var(--vscode-descriptionForeground); padding: 0 2px; }
    .not-connected-banner {
      background: var(--vscode-inputValidation-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      display: none;
    }
    .not-connected-banner.visible { display: block; }
    .not-connected-banner a { color: var(--vscode-textLink-foreground); cursor: pointer; }

    .tool-call-msg {
      display: flex; align-items: center; gap: 6px; font-size: 11px;
      color: var(--vscode-descriptionForeground); padding: 4px 8px;
      border-left: 2px solid var(--vscode-charts-blue);
      background: var(--vscode-editor-background);
      border-radius: 0 4px 4px 0;
      animation: fadeInTool 0.2s ease;
    }
    @keyframes fadeInTool { from { opacity:0; transform:translateX(-4px); } to { opacity:1; transform:none; } }
    .tool-note-msg { font-size:11px; color:var(--vscode-descriptionForeground); padding:2px 8px; opacity:0.7; }

    /* code blocks inside assistant messages */
    .msg-body code {
      background: var(--vscode-textCodeBlock-background);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
    }
    .msg-body pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 8px 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 6px 0;
    }
    .msg-body pre code { background: none; padding: 0; }
  </style>
</head>
<body>
  <div id="header">
    <div id="status-dot" title="Gateway connection status"></div>
    <h1>SageLLM</h1>
    <div id="model-badge" title="Click to switch model">No model</div>
    <button class="icon-btn" id="clear-btn" title="Clear conversation">\u{1F5D1}</button>
    <button class="icon-btn" id="restart-btn" title="Restart gateway (uses saved settings)">\u{1F504}</button>
    <button class="icon-btn" id="check-btn" title="Check connection">\u26A1</button>
  </div>

  <div id="messages">
    <div id="welcome">
      <div class="big">\u{1F916}</div>
      <h2>SageLLM Chat</h2>
      <p>Ask anything \u2014 code, debugging, explanations.</p>
    </div>
  </div>

  <div id="input-area">
    <div class="not-connected-banner" id="not-connected">
      \u26A0\uFE0F sagellm-gateway not reachable.
      <a id="start-gateway-link">Start gateway</a> \xB7
      <a id="install-link">Installation guide</a> \xB7
      <a id="retry-link">Retry</a>
    </div>
    <div id="input-row">
      <textarea
        id="user-input"
        placeholder="Ask SageLLM anything\u2026 (Enter to send, Shift+Enter for newline)"
        rows="1"
        autofocus
      ></textarea>
      <button id="send-btn">Send</button>
      <button id="abort-btn">Stop</button>
    </div>
    <div id="hint">Enter \u21B5 to send \xB7 Shift+Enter for newline \xB7 /clear to reset \xB7 @file:path for context</div>
  </div>

  <script nonce="${e}">
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const abortBtn = document.getElementById('abort-btn');
    const clearBtn = document.getElementById('clear-btn');
    const checkBtn = document.getElementById('check-btn');
    const restartBtn = document.getElementById('restart-btn');
    const modelBadge = document.getElementById('model-badge');
    const statusDot = document.getElementById('status-dot');
    const notConnected = document.getElementById('not-connected');
    const welcomeEl = document.getElementById('welcome');

    let isStreaming = false;
    let currentAssistantEl = null;

    function setStreaming(val) {
      isStreaming = val;
      sendBtn.style.display = val ? 'none' : '';
      abortBtn.classList.toggle('visible', val);
      inputEl.disabled = val;
    }

    function updateConnectionStatus(connected) {
      statusDot.classList.toggle('connected', connected);
      notConnected.classList.toggle('visible', !connected);
    }

    function updateModel(model) {
      modelBadge.textContent = model || 'No model';
    }

    function hideWelcome() {
      if (welcomeEl) welcomeEl.remove();
    }

    function appendMessage(role, text) {
      hideWelcome();
      const div = document.createElement('div');
      div.className = 'msg ' + role;

      const roleEl = document.createElement('div');
      roleEl.className = 'msg-role';
      roleEl.textContent = role === 'user' ? 'You' : role === 'assistant' ? 'SageLLM' : 'Error';

      const body = document.createElement('div');
      body.className = 'msg-body';

      if (role === 'assistant') {
        body.innerHTML = renderMarkdown(text);
      } else {
        body.textContent = text;
      }

      div.appendChild(roleEl);
      div.appendChild(body);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return body;
    }

    function appendTypingIndicator() {
      hideWelcome();
      const div = document.createElement('div');
      div.className = 'msg assistant';
      div.id = 'typing-msg';

      const roleEl = document.createElement('div');
      roleEl.className = 'msg-role';
      roleEl.textContent = 'SageLLM';

      const body = document.createElement('div');
      body.className = 'msg-body typing-indicator';
      body.innerHTML = '<span></span><span></span><span></span>';

      div.appendChild(roleEl);
      div.appendChild(body);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    // Minimal markdown renderer
    function renderMarkdown(text) {
      // avoid backtick literals inside template literal \u2014 build regex at runtime
      const BT = String.fromCharCode(96);
      const re3 = new RegExp(BT+BT+BT+'([\\s\\S]*?)'+BT+BT+BT, 'g');
      const re1 = new RegExp(BT+'([^'+BT+']+)'+BT, 'g');
      return text
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(re3, '<pre><code>$1</code></pre>')
        .replace(re1, '<code>$1</code>')
        .replace(/[*][*](.*?)[*][*]/g, '<strong>$1</strong>')
        .replace(/[*](.*?)[*]/g, '<em>$1</em>');
    }

    function sendMessage() {
      const text = inputEl.value.trim();
      if (!text || isStreaming) return;
      if (text === '/clear') {
        inputEl.value = '';
        vscode.postMessage({ type: 'clear' });
        return;
      }
      inputEl.value = '';
      autoResize();
      vscode.postMessage({ type: 'send', text });
    }

    function autoResize() {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px';
    }

    inputEl.addEventListener('input', autoResize);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    sendBtn.addEventListener('click', sendMessage);
    abortBtn.addEventListener('click', () => vscode.postMessage({ type: 'abort' }));
    clearBtn.addEventListener('click', () => vscode.postMessage({ type: 'clear' }));
    checkBtn.addEventListener('click', () => vscode.postMessage({ type: 'checkConnection' }));
    modelBadge.addEventListener('click', () => vscode.postMessage({ type: 'selectModel' }));
    document.getElementById('retry-link').addEventListener('click', () => vscode.postMessage({ type: 'checkConnection' }));
    document.getElementById('install-link').addEventListener('click', () => vscode.postMessage({ type: 'showInstallGuide' }));
    restartBtn.addEventListener('click', () => vscode.postMessage({ type: 'restartGateway' }));
    document.getElementById('start-gateway-link').addEventListener('click', () => vscode.postMessage({ type: 'restartGateway' }));

    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'init':
          updateConnectionStatus(msg.gatewayConnected);
          updateModel(msg.model);
          break;

        case 'userMessage':
          setStreaming(true);
          appendMessage('user', msg.text);
          break;

        case 'assistantStart': {
          const typingDiv = appendTypingIndicator();
          const body = typingDiv.querySelector('.msg-body');
          body.className = 'msg-body';
          body.textContent = '';
          currentAssistantEl = body;
          typingDiv.id = '';
          break;
        }
        case 'assistantDelta':
          if (currentAssistantEl) {
            currentAssistantEl.innerHTML = renderMarkdown(
              (currentAssistantEl._raw || '') + msg.text
            );
            currentAssistantEl._raw = (currentAssistantEl._raw || '') + msg.text;
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
          break;

        case 'assistantEnd':
          setStreaming(false);
          currentAssistantEl = null;
          break;

        case 'cleared':
          messagesEl.innerHTML = '';
          setStreaming(false);
          currentAssistantEl = null;
          const w = document.createElement('div');
          w.id = 'welcome'; w.classList.add('');
          w.innerHTML = '<div class="big">\u{1F916}</div><h2>SageLLM Chat</h2><p>Ask anything</p>';
          messagesEl.appendChild(w);
          break;

        case 'error':
          setStreaming(false);
          currentAssistantEl = null;
          appendMessage('error', '\u26A0\uFE0F ' + msg.text);
          break;

        case 'toolCall': {
          const toolDiv = document.createElement('div');
          toolDiv.className = 'tool-call-msg';
          let argsStr = '';
          try { const a = JSON.parse(msg.args || '{}'); argsStr = Object.values(a).slice(0, 2).join(', '); } catch {}
          toolDiv.textContent = '\u{1F527} ' + msg.tool + (argsStr ? '(' + argsStr + ')' : '');
          messagesEl.appendChild(toolDiv);
          messagesEl.scrollTop = messagesEl.scrollHeight;
          break;
        }
        case 'toolNote': {
          const noteDiv = document.createElement('div');
          noteDiv.className = 'tool-note-msg';
          noteDiv.textContent = msg.text;
          messagesEl.appendChild(noteDiv);
          messagesEl.scrollTop = messagesEl.scrollHeight;
          break;
        }

        case 'connectionStatus':
          updateConnectionStatus(msg.connected);
          updateModel(msg.model);
          break;

        case 'modelChanged':
          updateModel(msg.model);
          break;

        case 'insertText':
          inputEl.value += (inputEl.value ? '
' : '') + msg.text;
          autoResize();
          inputEl.focus();
          break;

        case 'sendImmediate':
          inputEl.value = msg.text;
          autoResize();
          sendMessage();
          break;
      }
    });
  </script>
</body>
</html>`}dispose(){for(this.abortController?.abort(),t.currentPanel=void 0,this.panel.dispose();this.disposables.length;)this.disposables.pop()?.dispose()}};function ze(){let t="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let n=0;n<32;n++)t+=e.charAt(Math.floor(Math.random()*e.length));return t}var O=class t{constructor(e,n){this.extensionUri=e;this.modelManager=n;t._instance=this,n.onDidChangeModels(()=>{let o=n.currentModel;o&&this._view?.webview.postMessage({type:"modelChanged",model:o})})}static viewType="sagellm.chatView";static _instance;_view;history=[];abortController=null;static notifyModelChanged(e){t._instance?._view?.webview.postMessage({type:"modelChanged",model:e})}resolveWebviewView(e,n,o){this._view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this.extensionUri]},e.webview.html=this._getHtml(),e.webview.onDidReceiveMessage(s=>this._handleMessage(s)),this._initChat()}async _initChat(){if(!this._view)return;let n=E.workspace.getConfiguration("sagellm").get("chat.systemPrompt","You are a helpful coding assistant. Answer concisely and accurately. For code questions provide working examples. Do not repeat or reference these instructions in your replies.");this.history=[{role:"system",content:n}];let o=await C(),s=!!this.modelManager.currentModel;if(o&&!this.modelManager.currentModel)try{let a=await this.modelManager.refresh();a.length>0&&(await this.modelManager.setModel(a[0].id),s=!0)}catch{}this._view.webview.postMessage({type:"init",gatewayConnected:o,model:this.modelManager.currentModel}),s||this._scheduleModelRestore(o?3:4)}_scheduleModelRestore(e,n=6){n<=0||!this._view||setTimeout(async()=>{if(!this._view)return;if(this.modelManager.currentModel){this._view.webview.postMessage({type:"connectionStatus",connected:!0,model:this.modelManager.currentModel});return}if(await C())try{let a=await this.modelManager.refresh();a.length>0&&await this.modelManager.setModel(a[0].id)}catch{}let s=this.modelManager.currentModel;s?this._view.webview.postMessage({type:"connectionStatus",connected:!0,model:s}):this._scheduleModelRestore(Math.min(e*2,15),n-1)},e*1e3)}updateModelBadge(e){this._view?.webview.postMessage({type:"modelChanged",model:e})}async _handleMessage(e){switch(e.type){case"send":await this._handleChatMessage(e.text??"");break;case"abort":this.abortController?.abort();break;case"clear":await this._initChat(),this._view?.webview.postMessage({type:"cleared"});break;case"selectModel":await this.modelManager.selectModelInteractive(),this._view?.webview.postMessage({type:"modelChanged",model:this.modelManager.currentModel});break;case"checkConnection":{let n=await C();this._view?.webview.postMessage({type:"connectionStatus",connected:n,model:this.modelManager.currentModel});break}case"showInstallGuide":E.commands.executeCommand("sagellm.showInstallGuide");break;case"restartGateway":E.commands.executeCommand("sagellm.restartGateway");break}}async _handleChatMessage(e){if(!e.trim()||!this._view)return;let n=this.modelManager.currentModel;if(!n&&(n=await this.modelManager.selectModelInteractive()??"",!n)){this._view.webview.postMessage({type:"error",text:"No model selected. Please select a model first."});return}let o=E.workspace.getConfiguration("sagellm"),s=o.get("chat.maxTokens",2048),a=o.get("chat.temperature",.7),i=o.get("chat.workspaceContext",!0);this._view.webview.postMessage({type:"userMessage",text:e}),this.abortController=new AbortController;try{await Oe(e,this.history,n,l=>this._view?.webview.postMessage(l),this.abortController.signal,{maxTokens:s,temperature:a,useContext:i})}finally{this.abortController=null}}_getHtml(){let e=ze();return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${e}'; style-src 'unsafe-inline';" />
  <title>SageLLM Chat</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    #header {
      display: flex; align-items: center; padding: 6px 10px; gap: 6px;
      background: var(--vscode-sideBarSectionHeader-background);
      border-bottom: 1px solid var(--vscode-panel-border); flex-shrink: 0;
    }
    #header h1 { font-size: 12px; font-weight: 600; flex: 1; }
    #model-badge {
      font-size: 10px; padding: 2px 6px; border-radius: 10px;
      background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
      cursor: pointer; user-select: none; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; max-width: 140px;
    }
    #status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--vscode-charts-red); flex-shrink: 0; }
    #status-dot.connected { background: var(--vscode-charts-green); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--vscode-foreground); padding: 3px; border-radius: 3px; font-size: 13px; line-height: 1; opacity: 0.7; }
    .icon-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }
    #messages { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 10px; }
    .msg { display: flex; flex-direction: column; gap: 3px; max-width: 100%; }
    .msg-role { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; }
    .msg-body { padding: 6px 10px; border-radius: 8px; line-height: 1.5; word-break: break-word; white-space: pre-wrap; }
    .user .msg-body { background: var(--vscode-button-background); color: var(--vscode-button-foreground); align-self: flex-end; border-radius: 8px 8px 2px 8px; max-width: 88%; }
    .user .msg-role { align-self: flex-end; }
    .assistant .msg-body { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px 8px 8px 2px; }
    .error-msg .msg-body { background: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-inputValidation-errorBorder); color: var(--vscode-inputValidation-errorForeground); }
    .typing-indicator span { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--vscode-foreground); opacity: 0.4; animation: bounce 1.2s infinite ease-in-out; }
    .typing-indicator span:nth-child(1) { animation-delay: 0s; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.4}40%{transform:scale(1.2);opacity:1} }
    #welcome { text-align: center; margin: auto; color: var(--vscode-descriptionForeground); }
    #welcome .big { font-size: 28px; margin-bottom: 6px; }
    #welcome h2 { font-size: 14px; margin-bottom: 3px; }
    #welcome p { font-size: 11px; opacity: 0.7; }
    #input-area { padding: 8px 10px; border-top: 1px solid var(--vscode-panel-border); display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
    #input-row { display: flex; gap: 5px; align-items: flex-end; }
    #user-input { flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 6px; padding: 5px 8px; font-family: inherit; font-size: inherit; resize: none; min-height: 34px; max-height: 120px; outline: none; line-height: 1.5; }
    #user-input:focus { border-color: var(--vscode-focusBorder); }
    #send-btn, #abort-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; white-space: nowrap; height: 34px; }
    #send-btn:hover { background: var(--vscode-button-hoverBackground); }
    #abort-btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); display: none; }
    #abort-btn.visible { display: block; }
    #hint { font-size: 10px; color: var(--vscode-descriptionForeground); padding: 0 2px; }
    .not-connected-banner { background: var(--vscode-inputValidation-warningBackground); border: 1px solid var(--vscode-inputValidation-warningBorder); border-radius: 6px; padding: 5px 8px; font-size: 11px; display: none; }
    .not-connected-banner.visible { display: block; }
    .not-connected-banner a { color: var(--vscode-textLink-foreground); cursor: pointer; }
    .tool-call-msg { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--vscode-descriptionForeground); padding:4px 8px; border-left:2px solid var(--vscode-charts-blue); background:var(--vscode-editor-background); border-radius:0 4px 4px 0; animation:fadeInTool 0.2s ease; }
    @keyframes fadeInTool { from { opacity:0; transform:translateX(-4px); } to { opacity:1; transform:none; } }
    .tool-note-msg { font-size:11px; color:var(--vscode-descriptionForeground); padding:2px 8px; opacity:0.7; }
    .msg-body code { background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 3px; font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    .msg-body pre { background: var(--vscode-textCodeBlock-background); padding: 6px 10px; border-radius: 6px; overflow-x: auto; margin: 4px 0; }
    .msg-body pre code { background: none; padding: 0; }
  </style>
</head>
<body>
  <div id="header">
    <div id="status-dot" title="Gateway connection status"></div>
    <h1>SageLLM</h1>
    <div id="model-badge" title="Click to switch model">No model</div>
    <button class="icon-btn" id="clear-btn" title="Clear conversation">\u{1F5D1}</button>
    <button class="icon-btn" id="restart-btn" title="Restart gateway (uses saved settings)">\u{1F504}</button>
    <button class="icon-btn" id="check-btn" title="Check connection">\u26A1</button>
  </div>
  <div id="messages">
    <div id="welcome">
      <div class="big">\u{1F916}</div>
      <h2>SageLLM Chat</h2>
      <p>Ask anything \u2014 code, debugging, explanations.</p>
    </div>
  </div>
  <div id="input-area">
    <div class="not-connected-banner" id="not-connected">
      \u26A0\uFE0F sagellm-gateway not reachable.
      <a id="start-gateway-link">Start gateway</a> \xB7
      <a id="install-link">Installation guide</a> \xB7
      <a id="retry-link">Retry</a>
    </div>
    <div id="input-row">
      <textarea id="user-input" placeholder="Ask SageLLM anything\u2026 (Enter to send)" rows="1" autofocus></textarea>
      <button id="send-btn">Send</button>
      <button id="abort-btn">Stop</button>
    </div>
    <div id="hint">Enter \u21B5 to send \xB7 Shift+Enter for newline \xB7 @file:path for context</div>
  </div>
  <script nonce="${e}">
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const abortBtn = document.getElementById('abort-btn');
    const clearBtn = document.getElementById('clear-btn');
    const checkBtn = document.getElementById('check-btn');
    const restartBtn = document.getElementById('restart-btn');
    const modelBadge = document.getElementById('model-badge');
    const statusDot = document.getElementById('status-dot');
    const notConnected = document.getElementById('not-connected');
    const welcomeEl = document.getElementById('welcome');
    let isStreaming = false;
    let currentAssistantEl = null;
    function setStreaming(val) { isStreaming = val; sendBtn.style.display = val ? 'none' : ''; abortBtn.classList.toggle('visible', val); inputEl.disabled = val; }
    function updateConnectionStatus(connected) { statusDot.classList.toggle('connected', connected); notConnected.classList.toggle('visible', !connected); }
    function updateModel(model) { modelBadge.textContent = model || 'No model'; }
    function hideWelcome() { if (welcomeEl) welcomeEl.remove(); }
    function appendMessage(role, text) {
      hideWelcome();
      const div = document.createElement('div'); div.className = 'msg ' + role;
      const roleEl = document.createElement('div'); roleEl.className = 'msg-role'; roleEl.textContent = role === 'user' ? 'You' : role === 'assistant' ? 'SageLLM' : 'Error';
      const body = document.createElement('div'); body.className = 'msg-body';
      if (role === 'assistant') { body.innerHTML = renderMarkdown(text); } else { body.textContent = text; }
      div.appendChild(roleEl); div.appendChild(body); messagesEl.appendChild(div); messagesEl.scrollTop = messagesEl.scrollHeight; return body;
    }
    function appendTypingIndicator() {
      hideWelcome();
      const div = document.createElement('div'); div.className = 'msg assistant'; div.id = 'typing-msg';
      const roleEl = document.createElement('div'); roleEl.className = 'msg-role'; roleEl.textContent = 'SageLLM';
      const body = document.createElement('div'); body.className = 'msg-body typing-indicator'; body.innerHTML = '<span></span><span></span><span></span>';
      div.appendChild(roleEl); div.appendChild(body); messagesEl.appendChild(div); messagesEl.scrollTop = messagesEl.scrollHeight; return div;
    }
    function renderMarkdown(text) {
      const BT = String.fromCharCode(96);
      const re3 = new RegExp(BT+BT+BT+'([\\s\\S]*?)'+BT+BT+BT, 'g');
      const re1 = new RegExp(BT+'([^'+BT+']+)'+BT, 'g');
      return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(re3,'<pre><code>$1</code></pre>').replace(re1,'<code>$1</code>').replace(/[*][*](.*?)[*][*]/g,'<strong>$1</strong>').replace(/[*](.*?)[*]/g,'<em>$1</em>');
    }
    function sendMessage() {
      const text = inputEl.value.trim(); if (!text || isStreaming) return;
      if (text === '/clear') { inputEl.value = ''; autoResize(); vscode.postMessage({ type: 'clear' }); return; }
      inputEl.value = ''; autoResize(); vscode.postMessage({ type: 'send', text });
    }
    function autoResize() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px'; }
    inputEl.addEventListener('input', autoResize);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    sendBtn.addEventListener('click', sendMessage);
    abortBtn.addEventListener('click', () => vscode.postMessage({ type: 'abort' }));
    clearBtn.addEventListener('click', () => vscode.postMessage({ type: 'clear' }));
    checkBtn.addEventListener('click', () => vscode.postMessage({ type: 'checkConnection' }));
    modelBadge.addEventListener('click', () => vscode.postMessage({ type: 'selectModel' }));
    document.getElementById('retry-link').addEventListener('click', () => vscode.postMessage({ type: 'checkConnection' }));
    document.getElementById('install-link').addEventListener('click', () => vscode.postMessage({ type: 'showInstallGuide' }));
    restartBtn.addEventListener('click', () => vscode.postMessage({ type: 'restartGateway' }));
    document.getElementById('start-gateway-link').addEventListener('click', () => vscode.postMessage({ type: 'restartGateway' }));
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'init': updateConnectionStatus(msg.gatewayConnected); updateModel(msg.model); break;
        case 'userMessage': setStreaming(true); appendMessage('user', msg.text); break;
        case 'assistantStart': { const td = appendTypingIndicator(); const b = td.querySelector('.msg-body'); b.className = 'msg-body'; b.textContent = ''; currentAssistantEl = b; td.id = ''; break; }
        case 'assistantDelta': if (currentAssistantEl) { currentAssistantEl.innerHTML = renderMarkdown((currentAssistantEl._raw || '') + msg.text); currentAssistantEl._raw = (currentAssistantEl._raw || '') + msg.text; messagesEl.scrollTop = messagesEl.scrollHeight; } break;
        case 'assistantEnd': setStreaming(false); currentAssistantEl = null; break;
        case 'cleared': messagesEl.innerHTML = ''; setStreaming(false); currentAssistantEl = null; const w = document.createElement('div'); w.id = 'welcome'; w.innerHTML = '<div class="big">\u{1F916}</div><h2>SageLLM Chat</h2><p>Ask anything</p>'; messagesEl.appendChild(w); break;
        case 'error': setStreaming(false); currentAssistantEl = null; appendMessage('error', '\u26A0\uFE0F ' + msg.text); break;
        case 'toolCall': { const td = document.createElement('div'); td.className = 'tool-call-msg'; let as = ''; try { const a = JSON.parse(msg.args||'{}'); as = Object.values(a).slice(0,2).join(', '); } catch {} td.textContent = '\u{1F527} ' + msg.tool + (as ? '(' + as + ')' : ''); messagesEl.appendChild(td); messagesEl.scrollTop = messagesEl.scrollHeight; break; }
        case 'toolNote': { const nd = document.createElement('div'); nd.className = 'tool-note-msg'; nd.textContent = msg.text; messagesEl.appendChild(nd); messagesEl.scrollTop = messagesEl.scrollHeight; break; }
        case 'connectionStatus': updateConnectionStatus(msg.connected); updateModel(msg.model); break;
        case 'modelChanged': updateModel(msg.model); break;
      }
    });
  </script>
</body>
</html>`}};var $=x(require("vscode"));function ht(t){let e=t.toLowerCase();return e.includes("qwen")?{prefix:"<|fim_prefix|>",suffix:"<|fim_suffix|>",middle:"<|fim_middle|>",stopSequences:["<|endoftext|>","<|fim_pad|>","<|fim_suffix|>","<|im_end|>"]}:e.includes("deepseek")?{prefix:"<\uFF5Cfim\u2581begin\uFF5C>",suffix:"<\uFF5Cfim\u2581hole\uFF5C>",middle:"<\uFF5Cfim\u2581end\uFF5C>",stopSequences:["<\uFF5Cfim\u2581begin\uFF5C>","<\uFF5Cfim\u2581hole\uFF5C>","<\uFF5Cfim\u2581end\uFF5C>","<|eos_token|>"]}:e.includes("codellama")||e.includes("mistral")?{prefix:"<PRE>",suffix:"<SUF>",middle:"<MID>",stopSequences:["<EOT>"]}:e.includes("starcoder")||e.includes("starchat")?{prefix:"<fim_prefix>",suffix:"<fim_suffix>",middle:"<fim_middle>",stopSequences:["<|endoftext|>","<fim_prefix>"]}:{prefix:"<|fim_prefix|>",suffix:"<|fim_suffix|>",middle:"<|fim_middle|>",stopSequences:["<|endoftext|>"]}}function ft(t,e){if(e<=0)return"";let n=$.workspace.textDocuments.filter(a=>a.uri.toString()!==t.toString()&&!a.isUntitled&&a.uri.scheme==="file"&&a.getText().length>10).slice(0,4);if(n.length===0)return"";let o=[],s=e;for(let a of n){if(s<=0)break;let i=$.workspace.asRelativePath(a.uri),l=a.getText().slice(0,Math.min(s,1200)),c=`// [${i}]
${l}`;o.push(c),s-=c.length}return`// \u2500\u2500\u2500 Related open files \u2500\u2500\u2500
${o.join(`

`)}
// \u2500\u2500\u2500 Current file \u2500\u2500\u2500
`}function vt(t,e){let n=t.lineAt(e.line).text,o=n.slice(0,e.character);if(o.trimStart().length<3)return!0;let a=n[e.character];if(a!==void 0&&/[\w]/.test(a)||/^\s*(\/\/|#|--|\/\*)/.test(n))return!0;let i=(o.match(/(?<!\\)'/g)??[]).length,l=(o.match(/(?<!\\)"/g)??[]).length;return i%2!==0||l%2!==0}function wt(t,e){let n=t;for(let s of e.stopSequences){let a=n.indexOf(s);a!==-1&&(n=n.slice(0,a))}for(let s of[e.prefix,e.suffix,e.middle]){let a=n.indexOf(s);a!==-1&&(n=n.slice(0,a))}let o=n.split(`
`);for(;o.length>0&&o[o.length-1].trim()==="";)o.pop();return o.join(`
`)}var re=class{constructor(e){this.modelManager=e}debounceTimer=null;nativeCompletionsAvailable=null;async provideInlineCompletionItems(e,n,o,s){let a=$.workspace.getConfiguration("sagellm");if(!a.get("inlineCompletion.enabled",!0))return null;let i=this.modelManager.currentModel;if(!i||vt(e,n))return null;let l=e.getText(),c=e.offsetAt(n),m=a.get("inlineCompletion.contextLines",80),h=Math.max(0,n.line-m),r=e.offsetAt(new $.Position(h,0)),d=l.slice(r,c),p=l.slice(c,Math.min(c+400,l.length)),f=a.get("inlineCompletion.tabContextChars",2e3),L=(a.get("inlineCompletion.useTabContext",!0)?ft(e.uri,f):"")+d,F=a.get("inlineCompletion.triggerDelay",350);if(await new Promise(D=>{this.debounceTimer&&clearTimeout(this.debounceTimer),this.debounceTimer=setTimeout(D,F)}),s.isCancellationRequested)return null;let v=ht(i),N=a.get("inlineCompletion.maxTokens",150),_=a.get("inlineCompletion.temperature",.05),I="";try{if(this.nativeCompletionsAvailable!==!1)try{I=await be({model:i,prompt:`${v.prefix}${L}${v.suffix}${p}${v.middle}`,max_tokens:N,temperature:_,stop:[...v.stopSequences,`


`]}),this.nativeCompletionsAvailable=!0}catch(de){if(de instanceof k&&de.statusCode===404)this.nativeCompletionsAvailable=!1;else throw de}if(this.nativeCompletionsAvailable===!1&&(I=await ye({model:i,messages:[{role:"user",content:`Complete the following ${e.languageId} code. Output ONLY the completion text \u2014 no explanation, no markdown fences.

${v.prefix}${L}${v.suffix}${p}${v.middle}`}],max_tokens:N,temperature:_})),s.isCancellationRequested)return null;let D=wt(I,v);return D.trim()?new $.InlineCompletionList([new $.InlineCompletionItem(D,new $.Range(n,n))]):null}catch(D){return D instanceof k,null}}dispose(){this.debounceTimer&&clearTimeout(this.debounceTimer)}};var z=x(require("vscode")),ce=class{statusBar;gatewayRunning=!1;currentModel="";constructor(){this.statusBar=z.window.createStatusBarItem(z.StatusBarAlignment.Right,100),this.statusBar.command="sagellm.openChat",this.update(),this.statusBar.show()}setGatewayStatus(e){this.gatewayRunning=e,this.update()}setModel(e){this.currentModel=e,this.update()}setConnecting(){this.statusBar.text="$(sync~spin) SageLLM",this.statusBar.tooltip="Connecting to sagellm-gateway...",this.statusBar.backgroundColor=void 0}setError(e){this.statusBar.text="$(error) SageLLM",this.statusBar.tooltip=`SageLLM: ${e}
Click to open chat`,this.statusBar.backgroundColor=new z.ThemeColor("statusBarItem.errorBackground")}update(){if(!this.gatewayRunning)this.statusBar.text="$(circle-slash) SageLLM",this.statusBar.tooltip="sagellm-gateway not connected \u2014 click to open chat and check status",this.statusBar.backgroundColor=new z.ThemeColor("statusBarItem.warningBackground");else{let e=this.currentModel?` (${this.currentModel})`:"";this.statusBar.text=`$(hubot) SageLLM${e}`,this.statusBar.tooltip=`sagellm-gateway connected${e}
Click to open chat`,this.statusBar.backgroundColor=void 0}}dispose(){this.statusBar.dispose()}};var H=null,M=null,Y=null;async function bt(t){let e=new se(t);M=new ce,t.subscriptions.push(M);let n=new O(t.extensionUri,e);t.subscriptions.push(g.window.registerWebviewViewProvider(O.viewType,n,{webviewOptions:{retainContextWhenHidden:!0}}));let o=new ae(e),s=g.window.createTreeView("sagellm.modelsView",{treeDataProvider:o,showCollapseAll:!1});t.subscriptions.push(s);let a=new re(e);t.subscriptions.push(g.languages.registerInlineCompletionItemProvider({pattern:"**"},a)),t.subscriptions.push(g.commands.registerCommand("sagellm.openChat",()=>{let r=g.window.activeTextEditor,d=r?.document.getText(r.selection)??"";R.createOrShow(t.extensionUri,e,d||void 0)}),g.commands.registerCommand("sagellm.selectModel",async()=>{await e.selectModelInteractive(),M?.setModel(e.currentModel),o.refresh()}),g.commands.registerCommand("sagellm.refreshModels",async()=>{await g.window.withProgress({location:g.ProgressLocation.Notification,title:"SageLLM: Fetching models\u2026",cancellable:!1},async()=>{try{await e.refresh(),o.refresh(),g.window.showInformationMessage(`SageLLM: ${e.getModels().length} model(s) loaded`)}catch(r){g.window.showErrorMessage(`SageLLM: ${r instanceof k?r.message:String(r)}`)}})}),g.commands.registerCommand("sagellm.startGateway",()=>q(t,M)),g.commands.registerCommand("sagellm.configureServer",()=>q(t,M)),g.commands.registerCommand("sagellm.stopGateway",()=>Ue(M)),g.commands.registerCommand("sagellm.restartGateway",async()=>{for(let u of g.window.terminals)u.name.startsWith("SageLLM")&&u.dispose();let r=g.workspace.getConfiguration("sagellm"),d=r.get("gateway.port",G);try{ge.execSync(`fuser -k ${d}/tcp 2>/dev/null; true`,{stdio:"ignore"})}catch{try{ge.execSync(`lsof -ti:${d} | xargs kill -9 2>/dev/null; true`,{stdio:"ignore"})}catch{}}await new Promise(u=>setTimeout(u,1500));let p=r.get("preloadModel","").trim(),f=r.get("backend","").trim();p&&f?Fe(M):q(t,M)}),g.commands.registerCommand("sagellm.showInstallGuide",()=>{xt(t.extensionUri)}),g.commands.registerCommand("sagellm.explainCode",()=>{let r=g.window.activeTextEditor;if(!r)return;let d=r.document.getText(r.selection);if(!d.trim()){g.window.showWarningMessage("SageLLM: Select some code first.");return}let p=r.document.languageId,f=g.workspace.asRelativePath(r.document.uri);R.invokeAction(t.extensionUri,e,`Explain this ${p} code from \`${f}\`:

\`\`\`${p}
${d}
\`\`\``)}),g.commands.registerCommand("sagellm.generateTests",()=>{let r=g.window.activeTextEditor;if(!r)return;let d=r.document.getText(r.selection);if(!d.trim()){g.window.showWarningMessage("SageLLM: Select a function or class first.");return}let p=r.document.languageId;R.invokeAction(t.extensionUri,e,`Write comprehensive unit tests for this ${p} code. Cover edge cases.

\`\`\`${p}
${d}
\`\`\``)}),g.commands.registerCommand("sagellm.fixCode",()=>{let r=g.window.activeTextEditor;if(!r)return;let d=r.document.getText(r.selection);if(!d.trim()){g.window.showWarningMessage("SageLLM: Select the code to fix.");return}let p=r.document.languageId;R.invokeAction(t.extensionUri,e,`Find bugs and fix this ${p} code. Show the corrected version with a brief explanation of each fix.

\`\`\`${p}
${d}
\`\`\``)}),g.commands.registerCommand("sagellm.generateDocstring",()=>{let r=g.window.activeTextEditor;if(!r)return;let d=r.document.getText(r.selection);if(!d.trim()){g.window.showWarningMessage("SageLLM: Select a function or class.");return}let p=r.document.languageId;R.invokeAction(t.extensionUri,e,`Write a docstring/JSDoc comment for this ${p} code. Follow the language's standard documentation style.

\`\`\`${p}
${d}
\`\`\``)}),g.commands.registerCommand("sagellm.runDiagnostics",async()=>{let r;await g.window.withProgress({location:g.ProgressLocation.Notification,title:"SageLLM: \u6B63\u5728\u68C0\u6D4B\u73AF\u5883\u2026",cancellable:!1},async()=>{let d=A.map(p=>p.id);r=await $e(d)}),r&&await Ie(r)}),g.commands.registerCommand("sagellm.checkConnection",async()=>{M?.setConnecting();let r=await C();if(M?.setGatewayStatus(r),r)await e.refresh().catch(()=>{}),o.refresh(),M?.setModel(e.currentModel),g.window.showInformationMessage("SageLLM: Gateway connected \u2713");else{let d=g.workspace.getConfiguration("sagellm"),p=d.get("gateway.host","localhost"),f=d.get("gateway.port",G),u=await g.window.showWarningMessage(`SageLLM: Cannot reach gateway at ${p}:${f}`,"Start Gateway","Installation Guide","Open Settings");u==="Start Gateway"?g.commands.executeCommand("sagellm.startGateway"):u==="Installation Guide"?g.commands.executeCommand("sagellm.showInstallGuide"):u==="Open Settings"&&g.commands.executeCommand("workbench.action.openSettings","@ext:intellistream.sagellm-vscode")}}));let i=g.workspace.getConfiguration("sagellm");if(i.get("autoStartGateway",!0)){let r=i.get("preloadModel","").trim(),d=i.get("backend","").trim();r&&d?C().then(p=>{p||Fe(M)}):C().then(p=>{p||setTimeout(()=>q(t,M),1500)})}Y=setInterval(async()=>{let r=await C();M?.setGatewayStatus(r),r&&e.currentModel&&M?.setModel(e.currentModel)},3e4),t.subscriptions.push({dispose:()=>{Y&&clearInterval(Y)}});async function l(r){let d=await C();if(M?.setGatewayStatus(d),d){let p=!1;try{let f=await e.refresh();if(o.refresh(),f.length>0){let u=e.currentModel||f[0].id,b=f.find(L=>L.id===u);await e.setModel(b?b.id:f[0].id),p=!0}M?.setModel(e.currentModel),e.currentModel&&(R.notifyModelChanged(e.currentModel),O.notifyModelChanged(e.currentModel))}catch{}return p}else return r&&await g.window.showWarningMessage("SageLLM: Gateway not reachable. Configure and start now?","Configure Server","Dismiss")==="Configure Server"&&g.commands.executeCommand("sagellm.configureServer"),!1}let c=0,m=10;async function h(){if(c++,c>m)return;let r=Math.min(2e3*c,3e4);setTimeout(async()=>{let d=c>=3;await l(d)||h()},r)}h(),setTimeout(()=>Le(t),9e4)}function yt(){Ue(M),Y&&clearInterval(Y)}function Fe(t){let e=g.workspace.getConfiguration("sagellm"),n=e.get("gatewayStartCommand","sagellm serve"),o=e.get("gateway.port",G),s=e.get("preloadModel","").trim(),a=e.get("backend","").trim();if(H&&!H.killed){g.window.showInformationMessage("SageLLM: Gateway is already running");return}let i=n;a&&(i+=` --backend ${a}`),s&&(i+=` --model ${s}`),i+=` --port ${o}`;let l=g.window.createTerminal({name:"SageLLM Gateway",isTransient:!1,env:{SAGELLM_PREFLIGHT_CANARY:"0"}});l.sendText(i),l.show(!1),t?.setConnecting(),g.window.showInformationMessage(`SageLLM: Starting gateway with "${i}"\u2026`);let c=0,m=100,h=setInterval(async()=>{if(c++,await C())clearInterval(h),t?.setGatewayStatus(!0),g.window.showInformationMessage("SageLLM: Gateway is ready \u2713");else if(c>=m)clearInterval(h),t?.setError("Gateway start timed out"),g.window.showWarningMessage("SageLLM: Gateway 5 \u5206\u949F\u5185\u672A\u54CD\u5E94\uFF0C\u8BF7\u68C0\u67E5\u7EC8\u7AEF\u8F93\u51FA\u3002","\u8FD0\u884C\u8BCA\u65AD","\u67E5\u770B\u7EC8\u7AEF").then(d=>{d==="\u8FD0\u884C\u8BCA\u65AD"&&g.commands.executeCommand("sagellm.runDiagnostics")});else if(c%20===0){let d=Math.round(c*3/60);t?.setConnecting(),g.window.setStatusBarMessage(`SageLLM: Loading model\u2026 (${d} min elapsed)`,5e3)}},3e3)}function Ue(t){H&&!H.killed&&(H.kill("SIGTERM"),H=null),t?.setGatewayStatus(!1)}function xt(t){let e=g.window.createWebviewPanel("sagellm.installGuide","SageLLM: Installation Guide",g.ViewColumn.One,{enableScripts:!1});e.webview.html=kt()}function kt(){return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SageLLM Installation Guide</title>
  <style>
    body {
      font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
      color: var(--vscode-foreground); background: var(--vscode-editor-background);
      max-width: 720px; margin: 0 auto; padding: 32px 24px; line-height: 1.6;
    }
    h1 { font-size: 24px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 4px; }
    code, pre {
      font-family: var(--vscode-editor-font-family);
      background: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
    }
    code { padding: 2px 6px; font-size: 0.9em; }
    pre { padding: 12px 16px; overflow-x: auto; margin: 8px 0; }
    pre code { background: none; padding: 0; }
    .step {
      display: flex; gap: 12px; margin-bottom: 16px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px; padding: 14px 16px;
    }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      display: flex; align-items: center; justify-content: center;
      font-weight: bold; flex-shrink: 0; font-size: 13px;
    }
    .note {
      background: var(--vscode-inputValidation-infoBackground);
      border: 1px solid var(--vscode-inputValidation-infoBorder);
      border-radius: 6px; padding: 10px 14px; margin: 12px 0;
      font-size: 12px;
    }
    a { color: var(--vscode-textLink-foreground); }
  </style>
</head>
<body>
  <h1>\u{1F680} SageLLM Setup Guide</h1>
  <p>Follow these steps to install SageLLM and connect this extension to it.</p>

  <h2>Prerequisites</h2>
  <div class="step">
    <div class="step-num">1</div>
    <div>
      <strong>Python 3.10+</strong> and a conda/virtualenv environment.<br/>
      <code>python --version</code>
    </div>
  </div>

  <h2>Install SageLLM</h2>
  <div class="step">
    <div class="step-num">2</div>
    <div>
      Install the SageLLM meta-package from PyPI:<br/>
      <pre><code>pip install isagellm</code></pre>
      Or install from source:<br/>
      <pre><code>git clone https://github.com/intellistream/sagellm
cd sagellm
pip install -e .[dev]</code></pre>
    </div>
  </div>

  <h2>Start the Server</h2>
  <div class="step">
    <div class="step-num">3</div>
    <div>
      Start the full inference stack (gateway + engine, OpenAI-compatible API):
      <pre><code>sagellm serve</code></pre>
      With a specific model and backend:
      <pre><code>sagellm serve --backend cpu --model Qwen/Qwen2.5-1.5B-Instruct</code></pre>
      On GPU (CUDA):
      <pre><code>sagellm serve --backend cuda --model Qwen/Qwen2.5-7B-Instruct</code></pre>
      <div class="note">\u{1F4A1} Tip: Add <code>SAGELLM_PREFLIGHT_CANARY=0</code> to skip the pre-validation step for faster first startup.</div>
    </div>
  </div>

  <h2>Configure the Extension</h2>
  <div class="step">
    <div class="step-num">4</div>
    <div>
      Open VS Code Settings (<code>Ctrl+,</code>) and search for <strong>SageLLM</strong>:
      <ul style="margin: 8px 0 0 16px;">
        <li><code>sagellm.gateway.host</code> \u2014 default: <code>localhost</code></li>
        <li><code>sagellm.gateway.port</code> \u2014 default: <code>8901</code> (<code>sagellm serve</code> default)</li>
        <li><code>sagellm.gateway.apiKey</code> \u2014 if your gateway requires auth</li>
      </ul>
    </div>
  </div>

  <div class="step">
    <div class="step-num">5</div>
    <div>
      Click the <strong>\u26A1 SageLLM</strong> item in the status bar, or run the command<br/>
      <strong>SageLLM: Check Connection</strong> to verify everything is working.
    </div>
  </div>

  <div class="note">
    \u2139\uFE0F The extension auto-starts <code>sagellm serve</code> when you enable
    <code>sagellm.autoStartGateway</code> in settings. Model loading may take
    several minutes \u2014 the extension polls for up to 5 minutes.
  </div>

  <h2>Resources</h2>
  <ul>
    <li><a href="https://github.com/intellistream/sagellm">SageLLM GitHub</a></li>
    <li><a href="https://github.com/intellistream/sagellm-vscode/issues">Report an issue</a></li>
  </ul>
</body>
</html>`}0&&(module.exports={activate,deactivate});
