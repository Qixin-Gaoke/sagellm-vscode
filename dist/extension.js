"use strict";var Ue=Object.create;var K=Object.defineProperty;var He=Object.getOwnPropertyDescriptor;var We=Object.getOwnPropertyNames;var Qe=Object.getPrototypeOf,qe=Object.prototype.hasOwnProperty;var Ve=(t,e)=>{for(var n in e)K(t,n,{get:e[n],enumerable:!0})},me=(t,e,n,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of We(e))!qe.call(t,s)&&s!==n&&K(t,s,{get:()=>e[s],enumerable:!(o=He(e,s))||o.enumerable});return t};var x=(t,e,n)=>(n=t!=null?Ue(Qe(t)):{},me(e||!t||!t.__esModule?K(n,"default",{value:t,enumerable:!0}):n,t)),je=t=>me(K({},"__esModule",{value:!0}),t);var xt={};Ve(xt,{activate:()=>vt,deactivate:()=>wt});module.exports=je(xt);var g=x(require("vscode")),ge=x(require("child_process"));var w=x(require("vscode"));var he=x(require("https")),fe=x(require("http")),ve=x(require("vscode"));var Ye={STUDIO_FRONTEND:5173,STUDIO_BACKEND:8765,SAGELLM_GATEWAY:8889,EDGE_DEFAULT:8899,SAGELLM_SERVE_PORT:8901,SAGELLM_ENGINE_PORT:8902,SAGELLM_SERVE_PORT_2:8903,SAGELLM_ENGINE_PORT_2:8904,EMBEDDING_DEFAULT:8090,EMBEDDING_SECONDARY:8091,BENCHMARK_EMBEDDING:8950,BENCHMARK_API:8951},R=Ye.SAGELLM_SERVE_PORT;var k=class extends Error{constructor(n,o){super(n);this.statusCode=o;this.name="GatewayConnectionError"}};function U(){let t=ve.workspace.getConfiguration("sagellm"),e=t.get("gateway.host","localhost"),n=t.get("gateway.port",R),o=t.get("gateway.apiKey","");return{baseUrl:`${t.get("gateway.tls",!1)?"https":"http"}://${e}:${n}`,apiKey:o}}function W(t,e,n,o){return new Promise((s,a)=>{let i=new URL(e),c=i.protocol==="https:"?he:fe,h={hostname:i.hostname,port:i.port,path:i.pathname+i.search,method:t,headers:{"Content-Type":"application/json",Accept:"application/json",...n?{Authorization:`Bearer ${n}`}:{},...o?{"Content-Length":Buffer.byteLength(o)}:{}}},f=c.request(h,r=>{let l="";r.on("data",u=>l+=u),r.on("end",()=>s({statusCode:r.statusCode??0,data:l}))});f.on("error",r=>a(new k(`Network error: ${r.message}`))),f.setTimeout(3e4,()=>{f.destroy(),a(new k("Request timed out after 30s"))}),o&&f.write(o),f.end()})}async function J(){let{baseUrl:t,apiKey:e}=U();try{let{statusCode:n,data:o}=await W("GET",`${t}/v1/models`,e);if(n!==200)throw new k(`Gateway returned HTTP ${n}`,n);return JSON.parse(o).data??[]}catch(n){throw n instanceof k?n:new k(`Failed to reach sagellm-gateway at ${t}: ${String(n)}`)}}async function C(){let{baseUrl:t,apiKey:e}=U();try{let{statusCode:n}=await W("GET",`${t}/v1/models`,e);return n===200}catch{return!1}}async function we(t,e,n){let{baseUrl:o,apiKey:s}=U(),a=JSON.stringify({...t,stream:!0});return new Promise((i,d)=>{if(n?.aborted){d(new Error("Aborted"));return}let c=new URL(`${o}/v1/chat/completions`),f=c.protocol==="https:"?he:fe,r={hostname:c.hostname,port:c.port,path:c.pathname,method:"POST",headers:{"Content-Type":"application/json",Accept:"text/event-stream",...s?{Authorization:`Bearer ${s}`}:{},"Content-Length":Buffer.byteLength(a)}},l="",u="",m=f.request(r,p=>{if(p.statusCode!==200){let y="";p.on("data",S=>y+=S),p.on("end",()=>d(new k(`Gateway returned HTTP ${p.statusCode}: ${y}`,p.statusCode)));return}p.on("data",y=>{u+=y.toString();let S=u.split(`
`);u=S.pop()??"";for(let D of S){let L=D.trim();if(!(!L||L==="data: [DONE]")&&L.startsWith("data: "))try{let b=JSON.parse(L.slice(6)).choices?.[0]?.delta?.content??"";b&&(l+=b,e(b))}catch{}}}),p.on("end",()=>i(l)),p.on("error",y=>d(new k(y.message)))});m.on("error",p=>d(new k(`Network error: ${p.message}`))),m.setTimeout(12e4,()=>{m.destroy(),d(new k("Chat request timed out after 120s"))}),n&&n.addEventListener("abort",()=>{m.destroy(),i(l)}),m.write(a),m.end()})}async function be(t){let{baseUrl:e,apiKey:n}=U(),o=JSON.stringify({...t,stream:!1}),{statusCode:s,data:a}=await W("POST",`${e}/v1/completions`,n,o);if(s===404)throw new k("Endpoint /v1/completions not available",404);if(s!==200)throw new k(`Gateway returned HTTP ${s}: ${a}`,s);return JSON.parse(a).choices?.[0]?.text??""}async function ye(t){let{baseUrl:e,apiKey:n}=U(),o=JSON.stringify({...t,stream:!1}),{statusCode:s,data:a}=await W("POST",`${e}/v1/chat/completions`,n,o);if(s!==200)throw new k(`Gateway returned HTTP ${s}: ${a}`,s);return JSON.parse(a).choices?.[0]?.message?.content??""}async function xe(t){let{baseUrl:e,apiKey:n}=U(),o=JSON.stringify({...t,stream:!1}),{statusCode:s,data:a}=await W("POST",`${e}/v1/chat/completions`,n,o);if(s!==200)throw new k(`Gateway returned HTTP ${s}: ${a}`,s);let d=JSON.parse(a).choices?.[0];return{message:d?.message??{role:"assistant",content:""},finishReason:d?.finish_reason??"stop"}}var v=x(require("vscode")),ne=x(require("child_process")),oe=x(require("fs")),pe=x(require("path")),Be=x(require("os"));var T=x(require("vscode")),Z=x(require("child_process")),ee=x(require("fs")),X=x(require("path")),ke=x(require("os")),Me=x(require("https"));function Ke(){return process.env.HF_HOME??X.join(ke.homedir(),".cache","huggingface","hub")}function Je(t){return"models--"+t.replace(/\//g,"--")}function te(t){let e=X.join(Ke(),Je(t),"blobs");try{return ee.readdirSync(e).filter(n=>n.endsWith(".incomplete")).map(n=>X.join(e,n))}catch{return[]}}function le(t){return te(t).length>0}async function Ce(t){let e=te(t);return e.length===0||await T.window.showWarningMessage(`SageLLM: "${t}" \u4E0B\u8F7D\u4E0D\u5B8C\u6574\uFF08${e.length} \u4E2A\u6587\u4EF6\u635F\u574F\uFF09\u3002\u52A0\u8F7D\u65F6\u4F1A\u62A5\u9519\uFF0C\u5EFA\u8BAE\u4FEE\u590D\u540E\u518D\u542F\u52A8\u3002`,{modal:!0},"\u4FEE\u590D\u4E0B\u8F7D","\u8DF3\u8FC7\uFF08\u53EF\u80FD\u5931\u8D25\uFF09")!=="\u4FEE\u590D\u4E0B\u8F7D"?!0:Ee(t,e)}async function Ee(t,e){let n=e??te(t);for(let o of n)try{ee.unlinkSync(o)}catch{}return T.window.withProgress({location:T.ProgressLocation.Notification,title:`SageLLM: \u4FEE\u590D ${t} \u2014 ${n.length} \u4E2A\u6587\u4EF6`,cancellable:!0},(o,s)=>new Promise(a=>{let i=Z.spawn("huggingface-cli",["download",t,"--resume-download"],{env:{...process.env}}),d=0,c=h=>{let f=h.match(/(\d+)%\|/);if(!f)return;let r=parseInt(f[1],10),l=r-d;if(l>0){d=r;let u=h.match(/[\d.]+\s*[MG]B\/s/)?.[0]??"",m=h.match(/<([\d:]+),/)?.[1]??"";o.report({increment:l,message:`${r}%${u?"  "+u:""}${m?"  ETA "+m:""}`})}};i.stderr.on("data",h=>h.toString().split(/\r?\n/).forEach(c)),i.stdout.on("data",h=>h.toString().split(/\r?\n/).forEach(c)),i.on("close",h=>{h===0?(o.report({increment:100-d,message:"\u5B8C\u6210 \u2713"}),T.window.showInformationMessage(`\u2705 SageLLM: ${t} \u4FEE\u590D\u5B8C\u6210`),a(!0)):(s.isCancellationRequested||T.window.showErrorMessage(`SageLLM: \u4FEE\u590D\u5931\u8D25 (exit ${h})`),a(!1))}),i.on("error",h=>{T.window.showErrorMessage(`SageLLM: \u65E0\u6CD5\u8FD0\u884C huggingface-cli \u2014 ${h.message}`),a(!1)}),s.onCancellationRequested(()=>{i.kill("SIGTERM"),a(!1)})}))}function Xe(t){try{return Z.execSync(`pip show ${t} 2>/dev/null`,{timeout:8e3}).toString().match(/^Version:\s*(.+)$/m)?.[1]?.trim()??""}catch{return""}}function Ze(t){return new Promise(e=>{let n=Me.get(`https://pypi.org/pypi/${encodeURIComponent(t)}/json`,{timeout:8e3},o=>{let s="";o.on("data",a=>s+=a),o.on("end",()=>{try{e(JSON.parse(s).info?.version??"")}catch{e("")}})});n.on("error",()=>e("")),n.on("timeout",()=>{n.destroy(),e("")})})}function et(t,e){let n=t.split(".").map(Number),o=e.split(".").map(Number);for(let s=0;s<Math.max(n.length,o.length);s++){let a=n[s]??0,i=o[s]??0;if(a>i)return!0;if(a<i)return!1}return!1}var tt=["isagellm","isagellm-core"];async function Se(){let t=[];for(let e of tt){let n=Xe(e);if(!n)continue;let o=await Ze(e);o&&t.push({name:e,installed:n,latest:o,needsUpgrade:et(o,n)})}return t}function Le(t){let e="sagellm.lastPackageCheckTs",n=t.globalState.get(e,0),o=24*60*60*1e3;Date.now()-n<o||(t.globalState.update(e,Date.now()),Se().then(s=>{let a=s.filter(d=>d.needsUpgrade);if(a.length===0)return;let i=a.map(d=>`${d.name} ${d.installed}\u2192${d.latest}`).join(", ");T.window.showWarningMessage(`SageLLM: \u6709\u65B0\u7248\u672C\u53EF\u7528 \u2014 ${i}`,"\u7ACB\u5373\u5347\u7EA7","\u7A0D\u540E").then(d=>{d==="\u7ACB\u5373\u5347\u7EA7"&&Te(a)})}).catch(()=>{}))}function Te(t){let e=t.filter(o=>o.needsUpgrade).map(o=>o.name);if(e.length===0)return;let n=T.window.createTerminal({name:"SageLLM: Upgrade",isTransient:!0});n.sendText(`pip install -U ${e.join(" ")}`),n.show(!0)}async function $e(t){let e=[];for(let o of t){let s=te(o);s.length>0&&e.push({modelId:o,count:s.length})}let n=await Se();return{corruptModels:e,outdatedPackages:n}}async function Ie(t){let{corruptModels:e,outdatedPackages:n}=t,o=n.filter(s=>s.needsUpgrade);if(e.length===0&&o.length===0){T.window.showInformationMessage("SageLLM: \u2705 \u672A\u53D1\u73B0\u95EE\u9898\uFF0C\u73AF\u5883\u914D\u7F6E\u6B63\u5E38");return}for(let s=0;s<20;s++){let a=T.QuickPickItemKind.Separator,i=[],d=e.filter(({modelId:r})=>le(r));if(d.length>0){i.push({label:"\u6A21\u578B\u4E0B\u8F7D\u95EE\u9898",kind:a});for(let{modelId:r,count:l}of d)i.push({label:`$(warning) ${r}`,description:`${l} \u4E2A\u6587\u4EF6\u635F\u574F \u2014 \u70B9\u51FB\u4FEE\u590D`,detail:r,_action:`fix:${r}`})}let c=o.filter(r=>r.needsUpgrade);if(c.length>0){i.push({label:"pip \u5305\u7248\u672C\u8FC7\u65E7",kind:a});for(let r of c)i.push({label:`$(arrow-up) ${r.name}`,description:`${r.installed} \u2192 ${r.latest}`,_action:"upgrade"});i.push({label:"$(terminal) \u5347\u7EA7\u6240\u6709\u8FC7\u65E7\u5305",description:c.map(r=>r.name).join(", "),_action:"upgrade"})}if(i.filter(r=>r.kind!==a).length===0){T.window.showInformationMessage("SageLLM: \u2705 \u6240\u6709\u95EE\u9898\u5DF2\u4FEE\u590D");return}let h=d.length+(c.length>0?1:0),f=await T.window.showQuickPick(i,{title:"SageLLM \u8BCA\u65AD \u2014 \u9009\u62E9\u95EE\u9898\u4EE5\u4FEE\u590D",placeHolder:`\u53D1\u73B0 ${h} \u4E2A\u95EE\u9898\uFF0C\u9009\u62E9\u4EFB\u610F\u4E00\u9879\u7ACB\u5373\u4FEE\u590D`});if(!f?._action)return;if(f._action.startsWith("fix:")){let r=f._action.slice(4);await Ee(r)}else if(f._action==="upgrade"){Te(c);return}}}var _=[{id:"Qwen/Qwen2.5-0.5B-Instruct",size:"0.5B",vram:"~1 GB",tags:["chat","cpu-ok","fast"],desc:"Tiny Qwen chat, runs on CPU"},{id:"Qwen/Qwen2.5-Coder-0.5B-Instruct",size:"0.5B",vram:"~1 GB",tags:["code","cpu-ok","fast"],desc:"Tiny code assistant"},{id:"TinyLlama/TinyLlama-1.1B-Chat-v1.0",size:"1.1B",vram:"~2 GB",tags:["chat","cpu-ok"],desc:"Lightweight general chat"},{id:"Qwen/Qwen2.5-1.5B-Instruct",size:"1.5B",vram:"~3 GB",tags:["chat","fast"],desc:"Fast Qwen chat"},{id:"Qwen/Qwen2.5-Coder-1.5B-Instruct",size:"1.5B",vram:"~3 GB",tags:["code","fast"],desc:"Fast code assistant"},{id:"deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",size:"1.5B",vram:"~3 GB",tags:["chat","reasoning"],desc:"DeepSeek-R1 distilled, strong reasoning"},{id:"Qwen/Qwen2.5-3B-Instruct",size:"3B",vram:"~6 GB",tags:["chat"],desc:"Balanced Qwen chat"},{id:"Qwen/Qwen2.5-Coder-3B-Instruct",size:"3B",vram:"~6 GB",tags:["code"],desc:"Balanced code assistant"},{id:"Qwen/Qwen2.5-7B-Instruct",size:"7B",vram:"~14 GB",tags:["chat","powerful"],desc:"Powerful Qwen chat (needs GPU)"},{id:"Qwen/Qwen2.5-Coder-7B-Instruct",size:"7B",vram:"~14 GB",tags:["code","powerful"],desc:"Powerful code assistant (needs GPU)"},{id:"deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",size:"7B",vram:"~14 GB",tags:["chat","reasoning","powerful"],desc:"DeepSeek-R1 distilled 7B"}];function Pe(){return pe.join(Be.homedir(),".cache","huggingface","hub")}function nt(t){return"models--"+t.replace(/\//g,"--")}function Q(t){let e=pe.join(Pe(),nt(t));return oe.existsSync(e)}function ot(){let t=new Set;try{for(let e of oe.readdirSync(Pe()))e.startsWith("models--")&&t.add(e.slice(8).replace(/--/g,"/"))}catch{}return t}async function st(t){return v.window.withProgress({location:v.ProgressLocation.Notification,title:`SageLLM: Downloading ${t}`,cancellable:!0},async(e,n)=>new Promise(o=>{let s=ne.spawn("huggingface-cli",["download",t,"--resume-download"],{env:{...process.env}}),a=0,i=c=>{let h=c.match(/(\d+)%\|/);if(h){let f=parseInt(h[1],10),r=f-a;if(r>0){a=f;let l=c.match(/[\d.]+\s*[MG]B\/s/)?.[0]??"",u=c.match(/<([\d:]+),/)?.[1]??"";e.report({increment:r,message:`${f}%${l?"  "+l:""}${u?"  ETA "+u:""}`})}}else if(c.includes("Downloading")){let f=c.match(/Downloading (.+?):/)?.[1];f&&e.report({message:f})}},d="";s.stderr.on("data",c=>{let h=c.toString();d+=h;for(let f of h.split(/\r?\n/))i(f)}),s.stdout.on("data",c=>{for(let h of c.toString().split(/\r?\n/))i(h)}),s.on("close",c=>{c===0?(e.report({increment:100-a,message:"\u5B8C\u6210 \u2713"}),o(!0)):(n.isCancellationRequested||v.window.showErrorMessage(`SageLLM: \u4E0B\u8F7D\u5931\u8D25 (exit ${c}).
${d.slice(-300)}`),o(!1))}),s.on("error",c=>{v.window.showErrorMessage(`SageLLM: \u65E0\u6CD5\u8FD0\u884C huggingface-cli: ${c.message}`),o(!1)}),n.onCancellationRequested(()=>{s.kill("SIGTERM"),o(!1)})}))}function at(t){let e=[{id:"cpu",label:"$(circuit-board) CPU",detected:!0,description:"Always available"}],n=/CUDA.*✅|✅.*CUDA|✅.*\d+\s*device/i.test(t),o=/Ascend.*✅|✅.*Ascend|✅.*torch_npu/i.test(t),s=t.match(/CUDA[^\n]*✅[^\n]*?-\s*(.+)|✅\s*\d+\s*device[^-]*-\s*(.+)/i),a=s?(s[1]||s[2]||"").trim().split(`
`)[0]:"";return n&&e.push({id:"cuda",label:"$(zap) CUDA (GPU)",detected:!0,description:a||"NVIDIA GPU detected"}),o&&e.push({id:"ascend",label:"$(hubot) Ascend (\u6607\u817E NPU)",detected:!0,description:"Ascend NPU detected"}),e}async function it(){return new Promise(t=>{ne.exec("sagellm info",{timeout:15e3},(e,n)=>{try{t(at(n??""))}catch{t([{id:"cpu",label:"$(circuit-board) CPU",detected:!0,description:"Always available"}])}})})}async function rt(){try{return(await J()).map(e=>e.id)}catch{return[]}}async function ct(t,e){let n=v.QuickPickItemKind.Separator,[o,s]=await Promise.all([rt(),Promise.resolve(ot())]),a=new Set,i=[],d=p=>{let y=p.detail??p.label;a.has(y)||(a.add(y),i.push(p))};if(e){let p=s.has(e);d({label:`$(star-full) ${e}`,description:p?"\u2705 last used":"\u2601\uFE0F last used (not cached)",detail:e})}if(o.length){i.push({label:"Running on gateway",kind:n});for(let p of o)d({label:`$(server) ${p}`,description:"\u2705 serving now",detail:p})}let c=_.filter(p=>s.has(p.id)),h=[...s].filter(p=>!_.some(y=>y.id===p)),f=t.filter(p=>s.has(p)),r=[],l=(p,y)=>{if(a.has(p))return;a.add(p);let S=le(p);r.push({label:S?`$(warning) ${p}`:`$(database) ${p}`,description:S?`\u26A0\uFE0F \u4E0B\u8F7D\u635F\u574F\uFF0C\u9009\u62E9\u540E\u53EF\u4FEE\u590D \u2014 ${y}`:`\u2705 ${y}`,detail:p})};c.forEach(p=>l(p.id,`${p.size} \xB7 ${p.vram} \xB7 ${p.desc}`)),f.forEach(p=>l(p,"recent")),h.forEach(p=>l(p,"local cache")),r.length&&(i.push({label:"Downloaded",kind:n}),i.push(...r));let u=[];for(let p of _){if(a.has(p.id))continue;a.add(p.id);let y=p.tags.includes("cpu-ok")?"runs on CPU \xB7 ":"";u.push({label:`$(cloud-download) ${p.id}`,description:`\u2601\uFE0F ${p.size} \xB7 ${p.vram}  \u2014  ${y}${p.desc}`,detail:p.id})}u.length&&(i.push({label:"Recommended  (will auto-download)",kind:n}),i.push(...u));let m=t.filter(p=>!a.has(p));if(m.length){i.push({label:"Recent",kind:n});for(let p of m)a.add(p),i.push({label:`$(history) ${p}`,description:"recent",detail:p})}return i.push({label:"",kind:n}),i.push({label:"$(edit) Enter model path / HuggingFace ID\u2026",description:"",detail:"__custom__"}),i}async function q(t,e){let n=v.workspace.getConfiguration("sagellm"),o=n.get("gateway.port",R);e?.setConnecting();let a=(await it()).map(b=>({label:b.label,description:b.detected?`\u2705 ${b.description}`:b.description,detail:b.id})),i=n.get("backend","");if(i){let b=a.findIndex(z=>z.detail===i);b>0&&a.unshift(...a.splice(b,1))}else a.reverse();let d=await v.window.showQuickPick(a,{title:"SageLLM: Select Inference Backend",placeHolder:"Choose hardware backend to use"});if(!d){e?.setGatewayStatus(!1);return}let c=d.detail;await n.update("backend",c,v.ConfigurationTarget.Global);let h=t.globalState.get("sagellm.recentModels",[]),f=n.get("preloadModel","").trim(),r=await v.window.withProgress({location:v.ProgressLocation.Notification,title:"SageLLM: Scanning models\u2026",cancellable:!1},()=>ct(h,f)),l=_.filter(b=>!Q(b.id)).length,u=await v.window.showQuickPick(r,{title:`SageLLM: Select Model  (\u2601\uFE0F ${l} available to download)`,placeHolder:"\u2705 downloaded \xB7 \u2601\uFE0F will auto-download \xB7 $(edit) custom path",matchOnDescription:!0,matchOnDetail:!1});if(!u){e?.setGatewayStatus(!1);return}let m=u.detail;if(m==="__custom__"){if(m=await v.window.showInputBox({title:"SageLLM: Model Path or HuggingFace ID",prompt:"e.g.  Qwen/Qwen2.5-7B-Instruct  or  /models/my-model",value:f,ignoreFocusOut:!0})??"",!m.trim()){e?.setGatewayStatus(!1);return}m=m.trim()}if(!m.startsWith("/"))if(Q(m)){if(!await Ce(m)){e?.setGatewayStatus(!1);return}}else{if(await v.window.showInformationMessage(`"${m}" \u5C1A\u672A\u4E0B\u8F7D\u3002\u662F\u5426\u73B0\u5728\u4E0B\u8F7D\uFF1F`,{modal:!0},"\u4E0B\u8F7D","\u53D6\u6D88")!=="\u4E0B\u8F7D"){e?.setGatewayStatus(!1);return}if(!await st(m)){e?.setGatewayStatus(!1);return}v.window.showInformationMessage(`\u2705 ${m} \u4E0B\u8F7D\u5B8C\u6210`)}await n.update("preloadModel",m,v.ConfigurationTarget.Global),await t.globalState.update("sagellm.recentModels",[m,...h.filter(b=>b!==m)].slice(0,10));let y=`${n.get("gatewayStartCommand","sagellm serve")} --backend ${c} --model ${m} --port ${o}`,S=v.window.createTerminal({name:"SageLLM Server",isTransient:!1,env:{SAGELLM_PREFLIGHT_CANARY:"0"}});S.sendText(y),S.show(!1),v.window.showInformationMessage(`SageLLM: Starting ${c.toUpperCase()} \xB7 ${m}\u2026`);let D=0,L=100,O=setInterval(async()=>{if(D++,await C())clearInterval(O),e?.setGatewayStatus(!0),v.window.showInformationMessage(`SageLLM: Server ready \u2713  (${c} \xB7 ${m})`);else if(D>=L)clearInterval(O),e?.setError("Server start timed out"),v.window.showWarningMessage("SageLLM: Server 5 \u5206\u949F\u5185\u672A\u54CD\u5E94\u3002","\u8FD0\u884C\u8BCA\u65AD","\u67E5\u770B\u7EC8\u7AEF").then(b=>{b==="\u8FD0\u884C\u8BCA\u65AD"&&v.commands.executeCommand("sagellm.runDiagnostics")});else if(D%20===0){let b=Math.round(D*3/60);v.window.setStatusBarMessage(`SageLLM: Loading model\u2026 (${b} min elapsed)`,5e3)}},3e3)}var V=w.QuickPickItemKind.Separator,se=class{constructor(e){this.context=e;this.selectedModel=w.workspace.getConfiguration("sagellm").get("model","")||e.globalState.get("sagellm.selectedModel","")}models=[];selectedModel="";_onDidChangeModels=new w.EventEmitter;onDidChangeModels=this._onDidChangeModels.event;get currentModel(){return this.selectedModel}getModels(){return this.models}async refresh(){try{return this.models=await J(),this._onDidChangeModels.fire(this.models),this.models}catch(e){throw e instanceof k?e:new Error(String(e))}}async selectModelInteractive(){let e=[];try{e=await this.refresh()}catch{}let n=new Set(e.map(c=>c.id)),o=[];if(e.length>0){o.push({label:"Running in gateway",kind:V});for(let c of e)o.push({label:`$(check) ${c.id}`,description:"\u25CF active",detail:c.id})}let s=_.filter(c=>Q(c.id)&&!n.has(c.id));if(s.length>0){o.push({label:"Downloaded \u2014 restart gateway to load",kind:V});for(let c of s)o.push({label:`$(package) ${c.id}`,description:`${c.size} \xB7 ${c.vram}`,detail:c.id})}let a=_.filter(c=>!Q(c.id)&&!n.has(c.id));if(a.length>0){o.push({label:"Available to download",kind:V});for(let c of a)o.push({label:`$(cloud-download) ${c.id}`,description:`${c.size} \xB7 ${c.vram} \xB7 ${c.desc}`,detail:c.id})}o.push({label:"",kind:V}),o.push({label:"$(edit) Enter model path / HuggingFace ID\u2026",description:"",detail:"__custom__"});let i=await w.window.showQuickPick(o,{placeHolder:"$(check) active  $(package) local  $(cloud-download) downloadable",title:"SageLLM: Select Model",matchOnDescription:!0});if(!i||i.kind===V)return;let d=i.detail??"";if(d==="__custom__"){if(d=await w.window.showInputBox({title:"SageLLM: Model Path or HuggingFace ID",prompt:"e.g.  Qwen/Qwen2.5-7B-Instruct  or  /models/my-model",value:this.selectedModel,ignoreFocusOut:!0})??"",!d.trim())return;d=d.trim()}return await this.setModel(d),n.has(d)||(await w.workspace.getConfiguration("sagellm").update("preloadModel",d,w.ConfigurationTarget.Global),await w.window.showInformationMessage(`"${d}" is not currently loaded. Restart gateway to use it?`,"Restart Gateway","Later")==="Restart Gateway"&&w.commands.executeCommand("sagellm.restartGateway")),d}async setModel(e){this.selectedModel=e,await this.context.globalState.update("sagellm.selectedModel",e),w.workspace.getConfiguration("sagellm").update("model",e,w.ConfigurationTarget.Global)}async ensureModel(){return this.selectedModel?this.selectedModel:this.selectModelInteractive()}dispose(){this._onDidChangeModels.dispose()}},ae=class{constructor(e){this.modelManager=e;e.onDidChangeModels(()=>this._onDidChangeTreeData.fire())}_onDidChangeTreeData=new w.EventEmitter;onDidChangeTreeData=this._onDidChangeTreeData.event;getTreeItem(e){return e}getChildren(){let e=this.modelManager.getModels();return e.length===0?[new ie("No models loaded",w.TreeItemCollapsibleState.None,!0)]:e.map(n=>new ie(n.id,w.TreeItemCollapsibleState.None,!1,n.id===this.modelManager.currentModel,n))}refresh(){this._onDidChangeTreeData.fire()}},ie=class extends w.TreeItem{constructor(n,o,s=!1,a=!1,i){super(n,o);this.model=i;s?(this.contextValue="placeholder",this.iconPath=new w.ThemeIcon("info")):a?(this.iconPath=new w.ThemeIcon("check"),this.contextValue="activeModel",this.description="active"):(this.iconPath=new w.ThemeIcon("hubot"),this.contextValue="model",this.command={command:"sagellm.selectModel",title:"Select Model",arguments:[n]})}};var E=x(require("vscode"));var P=x(require("vscode")),B=x(require("path")),$=x(require("fs")),_e=[{type:"function",function:{name:"get_active_file",description:"Get the content of the file currently open in the editor, along with the cursor position and any selected text.",parameters:{type:"object",properties:{}}}},{type:"function",function:{name:"read_file",description:"Read the contents of a file in the workspace. You can optionally specify a line range. The path can be absolute or relative to the workspace root.",parameters:{type:"object",properties:{path:{type:"string",description:"File path relative to workspace root or absolute"},start_line:{type:"number",description:"First line to read (1-based, inclusive). Optional."},end_line:{type:"number",description:"Last line to read (1-based, inclusive). Optional."}},required:["path"]}}},{type:"function",function:{name:"list_directory",description:"List the files and subdirectories in a directory. Returns names; trailing '/' indicates a directory.",parameters:{type:"object",properties:{path:{type:"string",description:"Directory path relative to workspace root (empty string or '.' for root)."}},required:[]}}},{type:"function",function:{name:"search_code",description:"Search for a text pattern (regex supported) across workspace files. Returns matching lines with file paths and line numbers. Like grep.",parameters:{type:"object",properties:{pattern:{type:"string",description:"Text or regex pattern to search for."},include_pattern:{type:"string",description:"Glob pattern to restrict which files are searched, e.g. '**/*.py'. Optional."},max_results:{type:"number",description:"Maximum number of results to return (default 30)."}},required:["pattern"]}}},{type:"function",function:{name:"get_workspace_info",description:"Get workspace metadata: root path, top-level directory listing, and currently open files.",parameters:{type:"object",properties:{}}}}];async function Ae(t,e){try{switch(t){case"get_active_file":return await dt();case"read_file":return await De(e);case"list_directory":return await lt(e);case"search_code":return await pt(e);case"get_workspace_info":return await ut();default:return`Unknown tool: ${t}`}}catch(n){return`Error executing tool ${t}: ${n instanceof Error?n.message:String(n)}`}}async function dt(){let t=P.window.activeTextEditor;if(!t)return"No file is currently open in the editor.";let e=t.document,n=e.fileName,o=j(),s=o?B.relative(o,n):n,a=t.selection,i=a.isEmpty?null:e.getText(a),d=a.active.line+1,h=e.getText().split(`
`),f=400,r=h.length>f,l=r?h.slice(0,f):h,u=`File: ${s}
Language: ${e.languageId}
Total lines: ${h.length}
Cursor at line: ${d}
`;return i&&(u+=`
Selected text (lines ${a.start.line+1}\u2013${a.end.line+1}):
\`\`\`
${i}
\`\`\`
`),u+=`
Content${r?` (first ${f} lines)`:""}:
\`\`\`${e.languageId}
${l.join(`
`)}`,r&&(u+=`
... (${h.length-f} more lines \u2014 use read_file with start_line/end_line to see more)
`),u+="\n```",u}async function De(t){let e=String(t.path??""),n=t.start_line!=null?Number(t.start_line):null,o=t.end_line!=null?Number(t.end_line):null;if(!e)return"Error: 'path' is required.";let s=ue(e);if(!s)return`Error: workspace root not found, cannot resolve '${e}'.`;if(!$.existsSync(s))return`Error: file not found: ${e}`;let a=$.statSync(s);if(a.isDirectory())return`Error: '${e}' is a directory. Use list_directory instead.`;if(a.size>2e5&&n==null)return`File is large (${Math.round(a.size/1024)} KB). Please specify start_line and end_line to read a portion.`;let c=$.readFileSync(s,"utf8").split(`
`),h=n!=null?Math.max(1,n):1,f=o!=null?Math.min(c.length,o):c.length,r=c.slice(h-1,f),l=B.extname(s).slice(1)||"text",u=h!==1||f!==c.length?` (lines ${h}\u2013${f} of ${c.length})`:` (${c.length} lines)`;return`File: ${e}${u}
\`\`\`${l}
${r.join(`
`)}
\`\`\``}async function lt(t){let e=String(t.path??"."),n=ue(e||".");if(!n)return"Error: no workspace folder open.";if(!$.existsSync(n))return`Error: directory not found: ${e}`;if(!$.statSync(n).isDirectory())return`Error: '${e}' is a file, not a directory.`;let s=$.readdirSync(n,{withFileTypes:!0}),a=new Set([".git","node_modules","__pycache__",".venv","venv","dist","build",".pytest_cache",".mypy_cache"]),i=s.filter(c=>!a.has(c.name)&&!c.name.startsWith(".")).sort((c,h)=>c.isDirectory()!==h.isDirectory()?c.isDirectory()?-1:1:c.name.localeCompare(h.name)).map(c=>c.isDirectory()?`${c.name}/`:c.name);return`Directory: ${e==="."?"(workspace root)":e}
${i.length===0?"(empty)":i.join(`
`)}`}async function pt(t){let e=String(t.pattern??""),n=t.include_pattern?String(t.include_pattern):"**/*",o=t.max_results!=null?Number(t.max_results):30;if(!e)return"Error: 'pattern' is required.";let s=j();if(!s)return"Error: no workspace folder open.";let a=[],i;try{i=new RegExp(e,"g")}catch{i=new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g")}let d=await P.workspace.findFiles(new P.RelativePattern(s,n),"{**/node_modules/**,**/.git/**,**/__pycache__/**,**/.venv/**,**/venv/**,**/dist/**,**/build/**}",500),c=0;for(let f of d){if(c>=o)break;try{let l=$.readFileSync(f.fsPath,"utf8").split(`
`);for(let u=0;u<l.length&&c<o;u++)if(i.lastIndex=0,i.test(l[u])){let m=B.relative(s,f.fsPath);a.push(`${m}:${u+1}: ${l[u].trim()}`),c++}}catch{}}return a.length===0?`No matches found for pattern: ${e}`:`${c>=o?`First ${o} matches`:`${c} match${c!==1?"es":""}`} for "${e}" in ${d.length} files searched:
${a.join(`
`)}`}async function ut(){let t=j();if(!t)return"No workspace folder is open.";let e=P.workspace.textDocuments.filter(s=>!s.isUntitled&&s.uri.scheme==="file").map(s=>B.relative(t,s.fileName)).filter(s=>!s.startsWith("..")),n="(unable to list)";try{let s=$.readdirSync(t,{withFileTypes:!0}),a=new Set([".git","node_modules","__pycache__",".venv","venv"]);n=s.filter(i=>!a.has(i.name)&&!i.name.startsWith(".")).sort((i,d)=>i.isDirectory()!==d.isDirectory()?i.isDirectory()?-1:1:i.name.localeCompare(d.name)).map(i=>i.isDirectory()?`  ${i.name}/`:`  ${i.name}`).join(`
`)}catch{}let o=(P.workspace.workspaceFolders??[]).map(s=>s.uri.fsPath).join(", ");return[`Workspace root: ${t}`,`All workspace folders: ${o||t}`,`
Top-level contents:
${n}`,e.length?`
Currently open files:
${e.map(s=>`  ${s}`).join(`
`)}`:""].filter(Boolean).join(`
`)}function Re(){let t=P.window.activeTextEditor;if(!t)return"";let e=t.document,n=j(),o=n?B.relative(n,e.fileName):e.fileName,s=t.selection,a=s.isEmpty?null:e.getText(s),i=e.lineCount,d=80,h=e.getText().split(`
`),f=h.slice(0,d).join(`
`),r=h.length>d,l=`

---
**Active file**: \`${o}\` (${e.languageId}, ${i} lines)
`;return a&&(l+=`**Selected text** (lines ${s.start.line+1}\u2013${s.end.line+1}):
\`\`\`${e.languageId}
${a}
\`\`\`
`),l+=`**File preview** (${r?`first ${d}`:`all ${i}`} lines):
\`\`\`${e.languageId}
${f}`,r&&(l+=`
... (use read_file tool for more)`),l+="\n```\n---",l}async function Ge(t){let e=[],n=t,o=/@file:(?:"([^"]+)"|(\S+))/g,s,a=[];for(;(s=o.exec(t))!==null;){let i=s[1]??s[2],d=ue(i);if(d&&$.existsSync(d)){e.push(i);let c=await De({path:i});a.push({original:s[0],replacement:`
${c}
`})}}for(let{original:i,replacement:d}of a)n=n.replace(i,d);return{resolved:n,mentions:e}}function j(){return P.workspace.workspaceFolders?.[0]?.uri.fsPath}function ue(t){if(B.isAbsolute(t))return t;let e=j();if(e)return B.join(e,t)}async function Ne(t,e,n,o,s,a){let{resolved:i,mentions:d}=await Ge(t);d.length&&o({type:"toolNote",text:`\u{1F4CE} Attached: ${d.join(", ")}`});let c=i;if(a.useContext){let r=Re();r&&(c=i+r)}e.push({role:"user",content:c});let h=5;for(let r=0;r<h&&!s.aborted;r++){let l,u;try{let m=await xe({model:n,messages:e,max_tokens:a.maxTokens,temperature:a.temperature,tools:_e,tool_choice:"auto"});l=m.finishReason,u=m.message}catch{break}if(l==="tool_calls"&&u.tool_calls?.length){e.push(u);for(let m of u.tool_calls){if(s.aborted)break;let p={};try{p=JSON.parse(m.function.arguments)}catch{}o({type:"toolCall",tool:m.function.name,args:m.function.arguments});let y=await Ae(m.function.name,p);e.push({role:"tool",tool_call_id:m.id,name:m.function.name,content:y})}continue}if(u.content){o({type:"assistantStart"});let m=u.content.match(/.{1,40}/gs)??[u.content];for(let p of m){if(s.aborted)break;o({type:"assistantDelta",text:p})}return o({type:"assistantEnd"}),e.push({role:"assistant",content:u.content}),u.content}break}o({type:"assistantStart"});let f="";try{f=await we({model:n,messages:e,max_tokens:a.maxTokens,temperature:a.temperature},r=>o({type:"assistantDelta",text:r}),s),e.push({role:"assistant",content:f}),o({type:"assistantEnd"})}catch(r){let l=r instanceof Error?r.message:String(r);o({type:"error",text:l}),e.pop()}return f}var A=class t{constructor(e,n,o){this.modelManager=o;this.panel=e,this.extensionUri=n,this.panel.webview.html=this.getHtml(),this.panel.onDidDispose(()=>this.dispose(),null,this.disposables),this.panel.webview.onDidReceiveMessage(s=>this.handleMessage(s),null,this.disposables),this.initChat()}static currentPanel;static viewType="sagellm.chatView";panel;extensionUri;history=[];abortController=null;disposables=[];static createOrShow(e,n,o){let s=E.window.activeTextEditor?E.ViewColumn.Beside:E.ViewColumn.One;if(t.currentPanel){t.currentPanel.panel.reveal(s),o&&t.currentPanel.sendSelectedText(o);return}let a=E.window.createWebviewPanel(t.viewType,"SageLLM Chat",s,{enableScripts:!0,retainContextWhenHidden:!0,localResourceRoots:[e]});t.currentPanel=new t(a,e,n),o&&t.currentPanel.sendSelectedText(o)}async initChat(){let n=E.workspace.getConfiguration("sagellm").get("chat.systemPrompt","You are a helpful coding assistant. Answer concisely and accurately. For code questions provide working examples. Do not repeat or reference these instructions in your replies.");this.history=[{role:"system",content:n}];let o=await C(),s=!!this.modelManager.currentModel;if(o&&!this.modelManager.currentModel)try{let a=await this.modelManager.refresh();a.length>0&&(await this.modelManager.setModel(a[0].id),s=!0)}catch{}this.panel.webview.postMessage({type:"init",gatewayConnected:o,model:this.modelManager.currentModel}),s||this.scheduleModelRestore(o?3:4)}scheduleModelRestore(e,n=6){n<=0||setTimeout(async()=>{if(this.modelManager.currentModel){this.panel.webview.postMessage({type:"connectionStatus",connected:!0,model:this.modelManager.currentModel});return}if(await C())try{let a=await this.modelManager.refresh();a.length>0&&await this.modelManager.setModel(a[0].id)}catch{}let s=this.modelManager.currentModel;s?this.panel.webview.postMessage({type:"connectionStatus",connected:!0,model:s}):this.scheduleModelRestore(Math.min(e*2,15),n-1)},e*1e3)}updateModelBadge(e){this.panel.webview.postMessage({type:"modelChanged",model:e})}static notifyModelChanged(e){t.currentPanel?.updateModelBadge(e),G.notifyModelChanged(e)}sendSelectedText(e){this.panel.webview.postMessage({type:"insertText",text:e})}static invokeAction(e,n,o){t.createOrShow(e,n),setTimeout(()=>{t.currentPanel?.panel.webview.postMessage({type:"sendImmediate",text:o})},350)}async handleMessage(e){switch(e.type){case"send":await this.handleChatMessage(e.text??"");break;case"abort":this.abortController?.abort();break;case"clear":await this.initChat(),this.panel.webview.postMessage({type:"cleared"});break;case"selectModel":await this.modelManager.selectModelInteractive(),this.panel.webview.postMessage({type:"modelChanged",model:this.modelManager.currentModel});break;case"checkConnection":{let n=await C();this.panel.webview.postMessage({type:"connectionStatus",connected:n,model:this.modelManager.currentModel});break}case"showInstallGuide":E.commands.executeCommand("sagellm.showInstallGuide");break;case"restartGateway":E.commands.executeCommand("sagellm.restartGateway");break}}async handleChatMessage(e){if(!e.trim())return;let n=this.modelManager.currentModel;if(!n&&(n=await this.modelManager.selectModelInteractive()??"",!n)){this.panel.webview.postMessage({type:"error",text:"No model selected. Please select a model first."});return}let o=E.workspace.getConfiguration("sagellm"),s=o.get("chat.maxTokens",2048),a=o.get("chat.temperature",.7),i=o.get("chat.workspaceContext",!0);this.panel.webview.postMessage({type:"userMessage",text:e}),this.abortController=new AbortController;try{await Ne(e,this.history,n,d=>this.panel.webview.postMessage(d),this.abortController.signal,{maxTokens:s,temperature:a,useContext:i})}finally{this.abortController=null}}getHtml(){let e=Oe();return`<!DOCTYPE html>
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
</html>`}dispose(){for(this.abortController?.abort(),t.currentPanel=void 0,this.panel.dispose();this.disposables.length;)this.disposables.pop()?.dispose()}};function Oe(){let t="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let n=0;n<32;n++)t+=e.charAt(Math.floor(Math.random()*e.length));return t}var G=class t{constructor(e,n){this.extensionUri=e;this.modelManager=n;t._instance=this,n.onDidChangeModels(()=>{let o=n.currentModel;o&&this._view?.webview.postMessage({type:"modelChanged",model:o})})}static viewType="sagellm.chatView";static _instance;_view;history=[];abortController=null;static notifyModelChanged(e){t._instance?._view?.webview.postMessage({type:"modelChanged",model:e})}resolveWebviewView(e,n,o){this._view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this.extensionUri]},e.webview.html=this._getHtml(),e.webview.onDidReceiveMessage(s=>this._handleMessage(s)),this._initChat()}async _initChat(){if(!this._view)return;let n=E.workspace.getConfiguration("sagellm").get("chat.systemPrompt","You are a helpful coding assistant. Answer concisely and accurately. For code questions provide working examples. Do not repeat or reference these instructions in your replies.");this.history=[{role:"system",content:n}];let o=await C(),s=!!this.modelManager.currentModel;if(o&&!this.modelManager.currentModel)try{let a=await this.modelManager.refresh();a.length>0&&(await this.modelManager.setModel(a[0].id),s=!0)}catch{}this._view.webview.postMessage({type:"init",gatewayConnected:o,model:this.modelManager.currentModel}),s||this._scheduleModelRestore(o?3:4)}_scheduleModelRestore(e,n=6){n<=0||!this._view||setTimeout(async()=>{if(!this._view)return;if(this.modelManager.currentModel){this._view.webview.postMessage({type:"connectionStatus",connected:!0,model:this.modelManager.currentModel});return}if(await C())try{let a=await this.modelManager.refresh();a.length>0&&await this.modelManager.setModel(a[0].id)}catch{}let s=this.modelManager.currentModel;s?this._view.webview.postMessage({type:"connectionStatus",connected:!0,model:s}):this._scheduleModelRestore(Math.min(e*2,15),n-1)},e*1e3)}updateModelBadge(e){this._view?.webview.postMessage({type:"modelChanged",model:e})}async _handleMessage(e){switch(e.type){case"send":await this._handleChatMessage(e.text??"");break;case"abort":this.abortController?.abort();break;case"clear":await this._initChat(),this._view?.webview.postMessage({type:"cleared"});break;case"selectModel":await this.modelManager.selectModelInteractive(),this._view?.webview.postMessage({type:"modelChanged",model:this.modelManager.currentModel});break;case"checkConnection":{let n=await C();this._view?.webview.postMessage({type:"connectionStatus",connected:n,model:this.modelManager.currentModel});break}case"showInstallGuide":E.commands.executeCommand("sagellm.showInstallGuide");break;case"restartGateway":E.commands.executeCommand("sagellm.restartGateway");break}}async _handleChatMessage(e){if(!e.trim()||!this._view)return;let n=this.modelManager.currentModel;if(!n&&(n=await this.modelManager.selectModelInteractive()??"",!n)){this._view.webview.postMessage({type:"error",text:"No model selected. Please select a model first."});return}let o=E.workspace.getConfiguration("sagellm"),s=o.get("chat.maxTokens",2048),a=o.get("chat.temperature",.7),i=o.get("chat.workspaceContext",!0);this._view.webview.postMessage({type:"userMessage",text:e}),this.abortController=new AbortController;try{await Ne(e,this.history,n,d=>this._view?.webview.postMessage(d),this.abortController.signal,{maxTokens:s,temperature:a,useContext:i})}finally{this.abortController=null}}_getHtml(){let e=Oe();return`<!DOCTYPE html>
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
</html>`}};var I=x(require("vscode"));function gt(t){let e=t.toLowerCase();return e.includes("qwen")?{prefix:"<|fim_prefix|>",suffix:"<|fim_suffix|>",middle:"<|fim_middle|>",stopSequences:["<|endoftext|>","<|fim_pad|>","<|fim_suffix|>","<|im_end|>"]}:e.includes("deepseek")?{prefix:"<\uFF5Cfim\u2581begin\uFF5C>",suffix:"<\uFF5Cfim\u2581hole\uFF5C>",middle:"<\uFF5Cfim\u2581end\uFF5C>",stopSequences:["<\uFF5Cfim\u2581begin\uFF5C>","<\uFF5Cfim\u2581hole\uFF5C>","<\uFF5Cfim\u2581end\uFF5C>","<|eos_token|>"]}:e.includes("codellama")||e.includes("mistral")?{prefix:"<PRE>",suffix:"<SUF>",middle:"<MID>",stopSequences:["<EOT>"]}:e.includes("starcoder")||e.includes("starchat")?{prefix:"<fim_prefix>",suffix:"<fim_suffix>",middle:"<fim_middle>",stopSequences:["<|endoftext|>","<fim_prefix>"]}:{prefix:"<|fim_prefix|>",suffix:"<|fim_suffix|>",middle:"<|fim_middle|>",stopSequences:["<|endoftext|>"]}}function mt(t,e){if(e<=0)return"";let n=I.workspace.textDocuments.filter(a=>a.uri.toString()!==t.toString()&&!a.isUntitled&&a.uri.scheme==="file"&&a.getText().length>10).slice(0,4);if(n.length===0)return"";let o=[],s=e;for(let a of n){if(s<=0)break;let i=I.workspace.asRelativePath(a.uri),d=a.getText().slice(0,Math.min(s,1200)),c=`// [${i}]
${d}`;o.push(c),s-=c.length}return`// \u2500\u2500\u2500 Related open files \u2500\u2500\u2500
${o.join(`

`)}
// \u2500\u2500\u2500 Current file \u2500\u2500\u2500
`}function ht(t,e){let n=t.lineAt(e.line).text,o=n.slice(0,e.character);if(o.trimStart().length<3)return!0;let a=n[e.character];if(a!==void 0&&/[\w]/.test(a)||/^\s*(\/\/|#|--|\/\*)/.test(n))return!0;let i=(o.match(/(?<!\\)'/g)??[]).length,d=(o.match(/(?<!\\)"/g)??[]).length;return i%2!==0||d%2!==0}function ft(t,e){let n=t;for(let s of e.stopSequences){let a=n.indexOf(s);a!==-1&&(n=n.slice(0,a))}for(let s of[e.prefix,e.suffix,e.middle]){let a=n.indexOf(s);a!==-1&&(n=n.slice(0,a))}let o=n.split(`
`);for(;o.length>0&&o[o.length-1].trim()==="";)o.pop();return o.join(`
`)}var re=class{constructor(e){this.modelManager=e}debounceTimer=null;nativeCompletionsAvailable=null;async provideInlineCompletionItems(e,n,o,s){let a=I.workspace.getConfiguration("sagellm");if(!a.get("inlineCompletion.enabled",!0))return null;let i=this.modelManager.currentModel;if(!i||ht(e,n))return null;let d=e.getText(),c=e.offsetAt(n),h=a.get("inlineCompletion.contextLines",80),f=Math.max(0,n.line-h),r=e.offsetAt(new I.Position(f,0)),l=d.slice(r,c),u=d.slice(c,Math.min(c+400,d.length)),m=a.get("inlineCompletion.tabContextChars",2e3),S=(a.get("inlineCompletion.useTabContext",!0)?mt(e.uri,m):"")+l,D=a.get("inlineCompletion.triggerDelay",350);if(await new Promise(F=>{this.debounceTimer&&clearTimeout(this.debounceTimer),this.debounceTimer=setTimeout(F,D)}),s.isCancellationRequested)return null;let L=gt(i),O=a.get("inlineCompletion.maxTokens",150),b=a.get("inlineCompletion.temperature",.05),z="";try{if(this.nativeCompletionsAvailable!==!1)try{z=await be({model:i,prompt:`${L.prefix}${S}${L.suffix}${u}${L.middle}`,max_tokens:O,temperature:b,stop:[...L.stopSequences,`


`]}),this.nativeCompletionsAvailable=!0}catch(de){if(de instanceof k&&de.statusCode===404)this.nativeCompletionsAvailable=!1;else throw de}if(this.nativeCompletionsAvailable===!1&&(z=await ye({model:i,messages:[{role:"user",content:`Complete the following ${e.languageId} code. Output ONLY the completion text \u2014 no explanation, no markdown fences.

${L.prefix}${S}${L.suffix}${u}${L.middle}`}],max_tokens:O,temperature:b})),s.isCancellationRequested)return null;let F=ft(z,L);return F.trim()?new I.InlineCompletionList([new I.InlineCompletionItem(F,new I.Range(n,n))]):null}catch(F){return F instanceof k,null}}dispose(){this.debounceTimer&&clearTimeout(this.debounceTimer)}};var N=x(require("vscode")),ce=class{statusBar;gatewayRunning=!1;currentModel="";constructor(){this.statusBar=N.window.createStatusBarItem(N.StatusBarAlignment.Right,100),this.statusBar.command="sagellm.openChat",this.update(),this.statusBar.show()}setGatewayStatus(e){this.gatewayRunning=e,this.update()}setModel(e){this.currentModel=e,this.update()}setConnecting(){this.statusBar.text="$(sync~spin) SageLLM",this.statusBar.tooltip="Connecting to sagellm-gateway...",this.statusBar.backgroundColor=void 0}setError(e){this.statusBar.text="$(error) SageLLM",this.statusBar.tooltip=`SageLLM: ${e}
Click to open chat`,this.statusBar.backgroundColor=new N.ThemeColor("statusBarItem.errorBackground")}update(){if(!this.gatewayRunning)this.statusBar.text="$(circle-slash) SageLLM",this.statusBar.tooltip="sagellm-gateway not connected \u2014 click to open chat and check status",this.statusBar.backgroundColor=new N.ThemeColor("statusBarItem.warningBackground");else{let e=this.currentModel?` (${this.currentModel})`:"";this.statusBar.text=`$(hubot) SageLLM${e}`,this.statusBar.tooltip=`sagellm-gateway connected${e}
Click to open chat`,this.statusBar.backgroundColor=void 0}}dispose(){this.statusBar.dispose()}};var H=null,M=null,Y=null;async function vt(t){let e=new se(t);M=new ce,t.subscriptions.push(M);let n=new G(t.extensionUri,e);t.subscriptions.push(g.window.registerWebviewViewProvider(G.viewType,n,{webviewOptions:{retainContextWhenHidden:!0}}));let o=new ae(e),s=g.window.createTreeView("sagellm.modelsView",{treeDataProvider:o,showCollapseAll:!1});t.subscriptions.push(s);let a=new re(e);t.subscriptions.push(g.languages.registerInlineCompletionItemProvider({pattern:"**"},a)),t.subscriptions.push(g.commands.registerCommand("sagellm.openChat",()=>{let r=g.window.activeTextEditor,l=r?.document.getText(r.selection)??"";A.createOrShow(t.extensionUri,e,l||void 0)}),g.commands.registerCommand("sagellm.selectModel",async()=>{await e.selectModelInteractive(),M?.setModel(e.currentModel),o.refresh()}),g.commands.registerCommand("sagellm.refreshModels",async()=>{await g.window.withProgress({location:g.ProgressLocation.Notification,title:"SageLLM: Fetching models\u2026",cancellable:!1},async()=>{try{await e.refresh(),o.refresh(),g.window.showInformationMessage(`SageLLM: ${e.getModels().length} model(s) loaded`)}catch(r){g.window.showErrorMessage(`SageLLM: ${r instanceof k?r.message:String(r)}`)}})}),g.commands.registerCommand("sagellm.startGateway",()=>q(t,M)),g.commands.registerCommand("sagellm.configureServer",()=>q(t,M)),g.commands.registerCommand("sagellm.stopGateway",()=>Fe(M)),g.commands.registerCommand("sagellm.restartGateway",async()=>{for(let p of g.window.terminals)p.name.startsWith("SageLLM")&&p.dispose();let r=g.workspace.getConfiguration("sagellm"),l=r.get("gateway.port",R);try{ge.execSync(`fuser -k ${l}/tcp 2>/dev/null; true`,{stdio:"ignore"})}catch{try{ge.execSync(`lsof -ti:${l} | xargs kill -9 2>/dev/null; true`,{stdio:"ignore"})}catch{}}await new Promise(p=>setTimeout(p,1500));let u=r.get("preloadModel","").trim(),m=r.get("backend","").trim();u&&m?ze(M):q(t,M)}),g.commands.registerCommand("sagellm.showInstallGuide",()=>{bt(t.extensionUri)}),g.commands.registerCommand("sagellm.explainCode",()=>{let r=g.window.activeTextEditor;if(!r)return;let l=r.document.getText(r.selection);if(!l.trim()){g.window.showWarningMessage("SageLLM: Select some code first.");return}let u=r.document.languageId,m=g.workspace.asRelativePath(r.document.uri);A.invokeAction(t.extensionUri,e,`Explain this ${u} code from \`${m}\`:

\`\`\`${u}
${l}
\`\`\``)}),g.commands.registerCommand("sagellm.generateTests",()=>{let r=g.window.activeTextEditor;if(!r)return;let l=r.document.getText(r.selection);if(!l.trim()){g.window.showWarningMessage("SageLLM: Select a function or class first.");return}let u=r.document.languageId;A.invokeAction(t.extensionUri,e,`Write comprehensive unit tests for this ${u} code. Cover edge cases.

\`\`\`${u}
${l}
\`\`\``)}),g.commands.registerCommand("sagellm.fixCode",()=>{let r=g.window.activeTextEditor;if(!r)return;let l=r.document.getText(r.selection);if(!l.trim()){g.window.showWarningMessage("SageLLM: Select the code to fix.");return}let u=r.document.languageId;A.invokeAction(t.extensionUri,e,`Find bugs and fix this ${u} code. Show the corrected version with a brief explanation of each fix.

\`\`\`${u}
${l}
\`\`\``)}),g.commands.registerCommand("sagellm.generateDocstring",()=>{let r=g.window.activeTextEditor;if(!r)return;let l=r.document.getText(r.selection);if(!l.trim()){g.window.showWarningMessage("SageLLM: Select a function or class.");return}let u=r.document.languageId;A.invokeAction(t.extensionUri,e,`Write a docstring/JSDoc comment for this ${u} code. Follow the language's standard documentation style.

\`\`\`${u}
${l}
\`\`\``)}),g.commands.registerCommand("sagellm.runDiagnostics",async()=>{let r;await g.window.withProgress({location:g.ProgressLocation.Notification,title:"SageLLM: \u6B63\u5728\u68C0\u6D4B\u73AF\u5883\u2026",cancellable:!1},async()=>{let l=_.map(u=>u.id);r=await $e(l)}),r&&await Ie(r)}),g.commands.registerCommand("sagellm.checkConnection",async()=>{M?.setConnecting();let r=await C();if(M?.setGatewayStatus(r),r)await e.refresh().catch(()=>{}),o.refresh(),M?.setModel(e.currentModel),g.window.showInformationMessage("SageLLM: Gateway connected \u2713");else{let l=g.workspace.getConfiguration("sagellm"),u=l.get("gateway.host","localhost"),m=l.get("gateway.port",R),p=await g.window.showWarningMessage(`SageLLM: Cannot reach gateway at ${u}:${m}`,"Start Gateway","Installation Guide","Open Settings");p==="Start Gateway"?g.commands.executeCommand("sagellm.startGateway"):p==="Installation Guide"?g.commands.executeCommand("sagellm.showInstallGuide"):p==="Open Settings"&&g.commands.executeCommand("workbench.action.openSettings","@ext:intellistream.sagellm-vscode")}}));let i=g.workspace.getConfiguration("sagellm");if(i.get("autoStartGateway",!0)){let r=i.get("preloadModel","").trim(),l=i.get("backend","").trim();r&&l?C().then(u=>{u||ze(M)}):C().then(u=>{u||setTimeout(()=>q(t,M),1500)})}Y=setInterval(async()=>{let r=await C();M?.setGatewayStatus(r),r&&e.currentModel&&M?.setModel(e.currentModel)},3e4),t.subscriptions.push({dispose:()=>{Y&&clearInterval(Y)}});async function d(r){let l=await C();if(M?.setGatewayStatus(l),l){let u=!1;try{let m=await e.refresh();if(o.refresh(),m.length>0){let p=e.currentModel||m[0].id,y=m.find(S=>S.id===p);await e.setModel(y?y.id:m[0].id),u=!0}M?.setModel(e.currentModel),e.currentModel&&(A.notifyModelChanged(e.currentModel),G.notifyModelChanged(e.currentModel))}catch{}return u}else return r&&await g.window.showWarningMessage("SageLLM: Gateway not reachable. Configure and start now?","Configure Server","Dismiss")==="Configure Server"&&g.commands.executeCommand("sagellm.configureServer"),!1}let c=0,h=10;async function f(){if(c++,c>h)return;let r=Math.min(2e3*c,3e4);setTimeout(async()=>{let l=c>=3;await d(l)||f()},r)}f(),setTimeout(()=>Le(t),9e4)}function wt(){Fe(M),Y&&clearInterval(Y)}function ze(t){let e=g.workspace.getConfiguration("sagellm"),n=e.get("gatewayStartCommand","sagellm serve"),o=e.get("gateway.port",R),s=e.get("preloadModel","").trim(),a=e.get("backend","").trim();if(H&&!H.killed){g.window.showInformationMessage("SageLLM: Gateway is already running");return}let i=n;a&&(i+=` --backend ${a}`),s&&(i+=` --model ${s}`),i+=` --port ${o}`;let d=g.window.createTerminal({name:"SageLLM Gateway",isTransient:!1,env:{SAGELLM_PREFLIGHT_CANARY:"0"}});d.sendText(i),d.show(!1),t?.setConnecting(),g.window.showInformationMessage(`SageLLM: Starting gateway with "${i}"\u2026`);let c=0,h=100,f=setInterval(async()=>{if(c++,await C())clearInterval(f),t?.setGatewayStatus(!0),g.window.showInformationMessage("SageLLM: Gateway is ready \u2713");else if(c>=h)clearInterval(f),t?.setError("Gateway start timed out"),g.window.showWarningMessage("SageLLM: Gateway 5 \u5206\u949F\u5185\u672A\u54CD\u5E94\uFF0C\u8BF7\u68C0\u67E5\u7EC8\u7AEF\u8F93\u51FA\u3002","\u8FD0\u884C\u8BCA\u65AD","\u67E5\u770B\u7EC8\u7AEF").then(l=>{l==="\u8FD0\u884C\u8BCA\u65AD"&&g.commands.executeCommand("sagellm.runDiagnostics")});else if(c%20===0){let l=Math.round(c*3/60);t?.setConnecting(),g.window.setStatusBarMessage(`SageLLM: Loading model\u2026 (${l} min elapsed)`,5e3)}},3e3)}function Fe(t){H&&!H.killed&&(H.kill("SIGTERM"),H=null),t?.setGatewayStatus(!1)}function bt(t){let e=g.window.createWebviewPanel("sagellm.installGuide","SageLLM: Installation Guide",g.ViewColumn.One,{enableScripts:!1});e.webview.html=yt()}function yt(){return`<!DOCTYPE html>
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
