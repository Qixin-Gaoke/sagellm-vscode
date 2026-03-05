"use strict";var Ce=Object.create;var q=Object.defineProperty;var Ee=Object.getOwnPropertyDescriptor;var Se=Object.getOwnPropertyNames;var Te=Object.getPrototypeOf,Le=Object.prototype.hasOwnProperty;var Be=(t,e)=>{for(var n in e)q(t,n,{get:e[n],enumerable:!0})},ae=(t,e,n,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of Se(e))!Le.call(t,o)&&o!==n&&q(t,o,{get:()=>e[o],enumerable:!(s=Ee(e,o))||s.enumerable});return t};var M=(t,e,n)=>(n=t!=null?Ce(Te(t)):{},ae(e||!t||!t.__esModule?q(n,"default",{value:t,enumerable:!0}):n,t)),Ie=t=>ae(q({},"__esModule",{value:!0}),t);var Xe={};Be(Xe,{activate:()=>Ve,deactivate:()=>je});module.exports=Ie(Xe);var g=M(require("vscode"));var x=M(require("vscode"));var ie=M(require("https")),re=M(require("http")),de=M(require("vscode"));var $e={STUDIO_FRONTEND:5173,STUDIO_BACKEND:8765,SAGELLM_GATEWAY:8889,EDGE_DEFAULT:8899,SAGELLM_SERVE_PORT:8901,SAGELLM_ENGINE_PORT:8902,SAGELLM_SERVE_PORT_2:8903,SAGELLM_ENGINE_PORT_2:8904,EMBEDDING_DEFAULT:8090,EMBEDDING_SECONDARY:8091,BENCHMARK_EMBEDDING:8950,BENCHMARK_API:8951},A=$e.SAGELLM_SERVE_PORT;var y=class extends Error{constructor(n,s){super(n);this.statusCode=s;this.name="GatewayConnectionError"}};function O(){let t=de.workspace.getConfiguration("sagellm"),e=t.get("gateway.host","localhost"),n=t.get("gateway.port",A),s=t.get("gateway.apiKey","");return{baseUrl:`${t.get("gateway.tls",!1)?"https":"http"}://${e}:${n}`,apiKey:s}}function U(t,e,n,s){return new Promise((o,a)=>{let i=new URL(e),d=i.protocol==="https:"?ie:re,f={hostname:i.hostname,port:i.port,path:i.pathname+i.search,method:t,headers:{"Content-Type":"application/json",Accept:"application/json",...n?{Authorization:`Bearer ${n}`}:{},...s?{"Content-Length":Buffer.byteLength(s)}:{}}},h=d.request(f,r=>{let p="";r.on("data",l=>p+=l),r.on("end",()=>o({statusCode:r.statusCode??0,data:p}))});h.on("error",r=>a(new y(`Network error: ${r.message}`))),h.setTimeout(3e4,()=>{h.destroy(),a(new y("Request timed out after 30s"))}),s&&h.write(s),h.end()})}async function Q(){let{baseUrl:t,apiKey:e}=O();try{let{statusCode:n,data:s}=await U("GET",`${t}/v1/models`,e);if(n!==200)throw new y(`Gateway returned HTTP ${n}`,n);return JSON.parse(s).data??[]}catch(n){throw n instanceof y?n:new y(`Failed to reach sagellm-gateway at ${t}: ${String(n)}`)}}async function k(){let{baseUrl:t,apiKey:e}=O();try{let{statusCode:n}=await U("GET",`${t}/v1/models`,e);return n===200}catch{return!1}}async function ce(t,e,n){let{baseUrl:s,apiKey:o}=O(),a=JSON.stringify({...t,stream:!0});return new Promise((i,u)=>{if(n?.aborted){u(new Error("Aborted"));return}let d=new URL(`${s}/v1/chat/completions`),h=d.protocol==="https:"?ie:re,r={hostname:d.hostname,port:d.port,path:d.pathname,method:"POST",headers:{"Content-Type":"application/json",Accept:"text/event-stream",...o?{Authorization:`Bearer ${o}`}:{},"Content-Length":Buffer.byteLength(a)}},p="",l="",m=h.request(r,c=>{if(c.statusCode!==200){let w="";c.on("data",L=>w+=L),c.on("end",()=>u(new y(`Gateway returned HTTP ${c.statusCode}: ${w}`,c.statusCode)));return}c.on("data",w=>{l+=w.toString();let L=l.split(`
`);l=L.pop()??"";for(let _ of L){let E=_.trim();if(!(!E||E==="data: [DONE]")&&E.startsWith("data: "))try{let b=JSON.parse(E.slice(6)).choices?.[0]?.delta?.content??"";b&&(p+=b,e(b))}catch{}}}),c.on("end",()=>i(p)),c.on("error",w=>u(new y(w.message)))});m.on("error",c=>u(new y(`Network error: ${c.message}`))),m.setTimeout(12e4,()=>{m.destroy(),u(new y("Chat request timed out after 120s"))}),n&&n.addEventListener("abort",()=>{m.destroy(),i(p)}),m.write(a),m.end()})}async function le(t){let{baseUrl:e,apiKey:n}=O(),s=JSON.stringify({...t,stream:!1}),{statusCode:o,data:a}=await U("POST",`${e}/v1/completions`,n,s);if(o===404)throw new y("Endpoint /v1/completions not available",404);if(o!==200)throw new y(`Gateway returned HTTP ${o}: ${a}`,o);return JSON.parse(a).choices?.[0]?.text??""}async function pe(t){let{baseUrl:e,apiKey:n}=O(),s=JSON.stringify({...t,stream:!1}),{statusCode:o,data:a}=await U("POST",`${e}/v1/chat/completions`,n,s);if(o!==200)throw new y(`Gateway returned HTTP ${o}: ${a}`,o);return JSON.parse(a).choices?.[0]?.message?.content??""}async function ue(t){let{baseUrl:e,apiKey:n}=O(),s=JSON.stringify({...t,stream:!1}),{statusCode:o,data:a}=await U("POST",`${e}/v1/chat/completions`,n,s);if(o!==200)throw new y(`Gateway returned HTTP ${o}: ${a}`,o);let u=JSON.parse(a).choices?.[0];return{message:u?.message??{role:"assistant",content:""},finishReason:u?.finish_reason??"stop"}}var V=class{constructor(e){this.context=e;this.selectedModel=x.workspace.getConfiguration("sagellm").get("model","")||e.globalState.get("sagellm.selectedModel","")}models=[];selectedModel="";_onDidChangeModels=new x.EventEmitter;onDidChangeModels=this._onDidChangeModels.event;get currentModel(){return this.selectedModel}getModels(){return this.models}async refresh(){try{return this.models=await Q(),this._onDidChangeModels.fire(this.models),this.models}catch(e){throw e instanceof y?e:new Error(String(e))}}async selectModelInteractive(){let e=this.models;if(e.length===0)try{e=await this.refresh()}catch{x.window.showErrorMessage("Cannot reach sagellm-gateway. Is it running? Run 'SageLLM: Start Gateway' or check your settings.");return}if(e.length===0){x.window.showWarningMessage("No models available on the gateway. Please load a model first.");return}let n=e.map(o=>({label:o.id,description:o.owned_by,detail:`Object: ${o.object}`})),s=await x.window.showQuickPick(n,{placeHolder:"Select a SageLLM model",title:"SageLLM: Available Models"});if(s)return await this.setModel(s.label),s.label}async setModel(e){this.selectedModel=e,await this.context.globalState.update("sagellm.selectedModel",e),x.workspace.getConfiguration("sagellm").update("model",e,x.ConfigurationTarget.Global)}async ensureModel(){return this.selectedModel?this.selectedModel:this.selectModelInteractive()}dispose(){this._onDidChangeModels.dispose()}},j=class{constructor(e){this.modelManager=e;e.onDidChangeModels(()=>this._onDidChangeTreeData.fire())}_onDidChangeTreeData=new x.EventEmitter;onDidChangeTreeData=this._onDidChangeTreeData.event;getTreeItem(e){return e}getChildren(){let e=this.modelManager.getModels();return e.length===0?[new Y("No models loaded",x.TreeItemCollapsibleState.None,!0)]:e.map(n=>new Y(n.id,x.TreeItemCollapsibleState.None,!1,n.id===this.modelManager.currentModel,n))}refresh(){this._onDidChangeTreeData.fire()}},Y=class extends x.TreeItem{constructor(n,s,o=!1,a=!1,i){super(n,s);this.model=i;o?(this.contextValue="placeholder",this.iconPath=new x.ThemeIcon("info")):a?(this.iconPath=new x.ThemeIcon("check"),this.contextValue="activeModel",this.description="active"):(this.iconPath=new x.ThemeIcon("hubot"),this.contextValue="model",this.command={command:"sagellm.selectModel",title:"Select Model",arguments:[n]})}};var S=M(require("vscode"));var $=M(require("vscode")),I=M(require("path")),T=M(require("fs")),ge=[{type:"function",function:{name:"get_active_file",description:"Get the content of the file currently open in the editor, along with the cursor position and any selected text.",parameters:{type:"object",properties:{}}}},{type:"function",function:{name:"read_file",description:"Read the contents of a file in the workspace. You can optionally specify a line range. The path can be absolute or relative to the workspace root.",parameters:{type:"object",properties:{path:{type:"string",description:"File path relative to workspace root or absolute"},start_line:{type:"number",description:"First line to read (1-based, inclusive). Optional."},end_line:{type:"number",description:"Last line to read (1-based, inclusive). Optional."}},required:["path"]}}},{type:"function",function:{name:"list_directory",description:"List the files and subdirectories in a directory. Returns names; trailing '/' indicates a directory.",parameters:{type:"object",properties:{path:{type:"string",description:"Directory path relative to workspace root (empty string or '.' for root)."}},required:[]}}},{type:"function",function:{name:"search_code",description:"Search for a text pattern (regex supported) across workspace files. Returns matching lines with file paths and line numbers. Like grep.",parameters:{type:"object",properties:{pattern:{type:"string",description:"Text or regex pattern to search for."},include_pattern:{type:"string",description:"Glob pattern to restrict which files are searched, e.g. '**/*.py'. Optional."},max_results:{type:"number",description:"Maximum number of results to return (default 30)."}},required:["pattern"]}}},{type:"function",function:{name:"get_workspace_info",description:"Get workspace metadata: root path, top-level directory listing, and currently open files.",parameters:{type:"object",properties:{}}}}];async function me(t,e){try{switch(t){case"get_active_file":return await Pe();case"read_file":return await he(e);case"list_directory":return await _e(e);case"search_code":return await Ae(e);case"get_workspace_info":return await Re();default:return`Unknown tool: ${t}`}}catch(n){return`Error executing tool ${t}: ${n instanceof Error?n.message:String(n)}`}}async function Pe(){let t=$.window.activeTextEditor;if(!t)return"No file is currently open in the editor.";let e=t.document,n=e.fileName,s=H(),o=s?I.relative(s,n):n,a=t.selection,i=a.isEmpty?null:e.getText(a),u=a.active.line+1,f=e.getText().split(`
`),h=400,r=f.length>h,p=r?f.slice(0,h):f,l=`File: ${o}
Language: ${e.languageId}
Total lines: ${f.length}
Cursor at line: ${u}
`;return i&&(l+=`
Selected text (lines ${a.start.line+1}\u2013${a.end.line+1}):
\`\`\`
${i}
\`\`\`
`),l+=`
Content${r?` (first ${h} lines)`:""}:
\`\`\`${e.languageId}
${p.join(`
`)}`,r&&(l+=`
... (${f.length-h} more lines \u2014 use read_file with start_line/end_line to see more)
`),l+="\n```",l}async function he(t){let e=String(t.path??""),n=t.start_line!=null?Number(t.start_line):null,s=t.end_line!=null?Number(t.end_line):null;if(!e)return"Error: 'path' is required.";let o=oe(e);if(!o)return`Error: workspace root not found, cannot resolve '${e}'.`;if(!T.existsSync(o))return`Error: file not found: ${e}`;let a=T.statSync(o);if(a.isDirectory())return`Error: '${e}' is a directory. Use list_directory instead.`;if(a.size>2e5&&n==null)return`File is large (${Math.round(a.size/1024)} KB). Please specify start_line and end_line to read a portion.`;let d=T.readFileSync(o,"utf8").split(`
`),f=n!=null?Math.max(1,n):1,h=s!=null?Math.min(d.length,s):d.length,r=d.slice(f-1,h),p=I.extname(o).slice(1)||"text",l=f!==1||h!==d.length?` (lines ${f}\u2013${h} of ${d.length})`:` (${d.length} lines)`;return`File: ${e}${l}
\`\`\`${p}
${r.join(`
`)}
\`\`\``}async function _e(t){let e=String(t.path??"."),n=oe(e||".");if(!n)return"Error: no workspace folder open.";if(!T.existsSync(n))return`Error: directory not found: ${e}`;if(!T.statSync(n).isDirectory())return`Error: '${e}' is a file, not a directory.`;let o=T.readdirSync(n,{withFileTypes:!0}),a=new Set([".git","node_modules","__pycache__",".venv","venv","dist","build",".pytest_cache",".mypy_cache"]),i=o.filter(d=>!a.has(d.name)&&!d.name.startsWith(".")).sort((d,f)=>d.isDirectory()!==f.isDirectory()?d.isDirectory()?-1:1:d.name.localeCompare(f.name)).map(d=>d.isDirectory()?`${d.name}/`:d.name);return`Directory: ${e==="."?"(workspace root)":e}
${i.length===0?"(empty)":i.join(`
`)}`}async function Ae(t){let e=String(t.pattern??""),n=t.include_pattern?String(t.include_pattern):"**/*",s=t.max_results!=null?Number(t.max_results):30;if(!e)return"Error: 'pattern' is required.";let o=H();if(!o)return"Error: no workspace folder open.";let a=[],i;try{i=new RegExp(e,"g")}catch{i=new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g")}let u=await $.workspace.findFiles(new $.RelativePattern(o,n),"{**/node_modules/**,**/.git/**,**/__pycache__/**,**/.venv/**,**/venv/**,**/dist/**,**/build/**}",500),d=0;for(let h of u){if(d>=s)break;try{let p=T.readFileSync(h.fsPath,"utf8").split(`
`);for(let l=0;l<p.length&&d<s;l++)if(i.lastIndex=0,i.test(p[l])){let m=I.relative(o,h.fsPath);a.push(`${m}:${l+1}: ${p[l].trim()}`),d++}}catch{}}return a.length===0?`No matches found for pattern: ${e}`:`${d>=s?`First ${s} matches`:`${d} match${d!==1?"es":""}`} for "${e}" in ${u.length} files searched:
${a.join(`
`)}`}async function Re(){let t=H();if(!t)return"No workspace folder is open.";let e=$.workspace.textDocuments.filter(o=>!o.isUntitled&&o.uri.scheme==="file").map(o=>I.relative(t,o.fileName)).filter(o=>!o.startsWith("..")),n="(unable to list)";try{let o=T.readdirSync(t,{withFileTypes:!0}),a=new Set([".git","node_modules","__pycache__",".venv","venv"]);n=o.filter(i=>!a.has(i.name)&&!i.name.startsWith(".")).sort((i,u)=>i.isDirectory()!==u.isDirectory()?i.isDirectory()?-1:1:i.name.localeCompare(u.name)).map(i=>i.isDirectory()?`  ${i.name}/`:`  ${i.name}`).join(`
`)}catch{}let s=($.workspace.workspaceFolders??[]).map(o=>o.uri.fsPath).join(", ");return[`Workspace root: ${t}`,`All workspace folders: ${s||t}`,`
Top-level contents:
${n}`,e.length?`
Currently open files:
${e.map(o=>`  ${o}`).join(`
`)}`:""].filter(Boolean).join(`
`)}function fe(){let t=$.window.activeTextEditor;if(!t)return"";let e=t.document,n=H(),s=n?I.relative(n,e.fileName):e.fileName,o=t.selection,a=o.isEmpty?null:e.getText(o),i=e.lineCount,u=80,f=e.getText().split(`
`),h=f.slice(0,u).join(`
`),r=f.length>u,p=`

---
**Active file**: \`${s}\` (${e.languageId}, ${i} lines)
`;return a&&(p+=`**Selected text** (lines ${o.start.line+1}\u2013${o.end.line+1}):
\`\`\`${e.languageId}
${a}
\`\`\`
`),p+=`**File preview** (${r?`first ${u}`:`all ${i}`} lines):
\`\`\`${e.languageId}
${h}`,r&&(p+=`
... (use read_file tool for more)`),p+="\n```\n---",p}async function ve(t){let e=[],n=t,s=/@file:(?:"([^"]+)"|(\S+))/g,o,a=[];for(;(o=s.exec(t))!==null;){let i=o[1]??o[2],u=oe(i);if(u&&T.existsSync(u)){e.push(i);let d=await he({path:i});a.push({original:o[0],replacement:`
${d}
`})}}for(let{original:i,replacement:u}of a)n=n.replace(i,u);return{resolved:n,mentions:e}}function H(){return $.workspace.workspaceFolders?.[0]?.uri.fsPath}function oe(t){if(I.isAbsolute(t))return t;let e=H();if(e)return I.join(e,t)}async function we(t,e,n,s,o,a){let{resolved:i,mentions:u}=await ve(t);u.length&&s({type:"toolNote",text:`\u{1F4CE} Attached: ${u.join(", ")}`});let d=i;if(a.useContext){let r=fe();r&&(d=i+r)}e.push({role:"user",content:d});let f=5;for(let r=0;r<f&&!o.aborted;r++){let p,l;try{let m=await ue({model:n,messages:e,max_tokens:a.maxTokens,temperature:a.temperature,tools:ge,tool_choice:"auto"});p=m.finishReason,l=m.message}catch{break}if(p==="tool_calls"&&l.tool_calls?.length){e.push(l);for(let m of l.tool_calls){if(o.aborted)break;let c={};try{c=JSON.parse(m.function.arguments)}catch{}s({type:"toolCall",tool:m.function.name,args:m.function.arguments});let w=await me(m.function.name,c);e.push({role:"tool",tool_call_id:m.id,name:m.function.name,content:w})}continue}if(l.content){s({type:"assistantStart"});let m=l.content.match(/.{1,40}/gs)??[l.content];for(let c of m){if(o.aborted)break;s({type:"assistantDelta",text:c})}return s({type:"assistantEnd"}),e.push({role:"assistant",content:l.content}),l.content}break}s({type:"assistantStart"});let h="";try{h=await ce({model:n,messages:e,max_tokens:a.maxTokens,temperature:a.temperature},r=>s({type:"assistantDelta",text:r}),o),e.push({role:"assistant",content:h}),s({type:"assistantEnd"})}catch(r){let p=r instanceof Error?r.message:String(r);s({type:"error",text:p}),e.pop()}return h}var P=class t{constructor(e,n,s){this.modelManager=s;this.panel=e,this.extensionUri=n,this.panel.webview.html=this.getHtml(),this.panel.onDidDispose(()=>this.dispose(),null,this.disposables),this.panel.webview.onDidReceiveMessage(o=>this.handleMessage(o),null,this.disposables),this.initChat()}static currentPanel;static viewType="sagellm.chatView";panel;extensionUri;history=[];abortController=null;disposables=[];static createOrShow(e,n,s){let o=S.window.activeTextEditor?S.ViewColumn.Beside:S.ViewColumn.One;if(t.currentPanel){t.currentPanel.panel.reveal(o),s&&t.currentPanel.sendSelectedText(s);return}let a=S.window.createWebviewPanel(t.viewType,"SageLLM Chat",o,{enableScripts:!0,retainContextWhenHidden:!0,localResourceRoots:[e]});t.currentPanel=new t(a,e,n),s&&t.currentPanel.sendSelectedText(s)}async initChat(){let n=S.workspace.getConfiguration("sagellm").get("chat.systemPrompt","You are a helpful coding assistant. Answer concisely and accurately. For code questions provide working examples. Do not repeat or reference these instructions in your replies.");this.history=[{role:"system",content:n}];let s=await k(),o=!!this.modelManager.currentModel;if(s&&!this.modelManager.currentModel)try{let a=await this.modelManager.refresh();a.length>0&&(await this.modelManager.setModel(a[0].id),o=!0)}catch{}this.panel.webview.postMessage({type:"init",gatewayConnected:s,model:this.modelManager.currentModel}),o||this.scheduleModelRestore(s?3:4)}scheduleModelRestore(e,n=6){n<=0||setTimeout(async()=>{if(this.modelManager.currentModel){this.panel.webview.postMessage({type:"connectionStatus",connected:!0,model:this.modelManager.currentModel});return}if(await k())try{let a=await this.modelManager.refresh();a.length>0&&await this.modelManager.setModel(a[0].id)}catch{}let o=this.modelManager.currentModel;o?this.panel.webview.postMessage({type:"connectionStatus",connected:!0,model:o}):this.scheduleModelRestore(Math.min(e*2,15),n-1)},e*1e3)}updateModelBadge(e){this.panel.webview.postMessage({type:"modelChanged",model:e})}static notifyModelChanged(e){t.currentPanel?.updateModelBadge(e),R.notifyModelChanged(e)}sendSelectedText(e){this.panel.webview.postMessage({type:"insertText",text:e})}static invokeAction(e,n,s){t.createOrShow(e,n),setTimeout(()=>{t.currentPanel?.panel.webview.postMessage({type:"sendImmediate",text:s})},350)}async handleMessage(e){switch(e.type){case"send":await this.handleChatMessage(e.text??"");break;case"abort":this.abortController?.abort();break;case"clear":await this.initChat(),this.panel.webview.postMessage({type:"cleared"});break;case"selectModel":await this.modelManager.selectModelInteractive(),this.panel.webview.postMessage({type:"modelChanged",model:this.modelManager.currentModel});break;case"checkConnection":{let n=await k();this.panel.webview.postMessage({type:"connectionStatus",connected:n,model:this.modelManager.currentModel});break}case"showInstallGuide":S.commands.executeCommand("sagellm.showInstallGuide");break}}async handleChatMessage(e){if(!e.trim())return;let n=this.modelManager.currentModel;if(!n&&(n=await this.modelManager.selectModelInteractive()??"",!n)){this.panel.webview.postMessage({type:"error",text:"No model selected. Please select a model first."});return}let s=S.workspace.getConfiguration("sagellm"),o=s.get("chat.maxTokens",2048),a=s.get("chat.temperature",.7),i=s.get("chat.workspaceContext",!0);this.panel.webview.postMessage({type:"userMessage",text:e}),this.abortController=new AbortController;try{await we(e,this.history,n,u=>this.panel.webview.postMessage(u),this.abortController.signal,{maxTokens:o,temperature:a,useContext:i})}finally{this.abortController=null}}getHtml(){let e=be();return`<!DOCTYPE html>
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
</html>`}dispose(){for(this.abortController?.abort(),t.currentPanel=void 0,this.panel.dispose();this.disposables.length;)this.disposables.pop()?.dispose()}};function be(){let t="",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";for(let n=0;n<32;n++)t+=e.charAt(Math.floor(Math.random()*e.length));return t}var R=class t{constructor(e,n){this.extensionUri=e;this.modelManager=n;t._instance=this,n.onDidChangeModels(()=>{let s=n.currentModel;s&&this._view?.webview.postMessage({type:"modelChanged",model:s})})}static viewType="sagellm.chatView";static _instance;_view;history=[];abortController=null;static notifyModelChanged(e){t._instance?._view?.webview.postMessage({type:"modelChanged",model:e})}resolveWebviewView(e,n,s){this._view=e,e.webview.options={enableScripts:!0,localResourceRoots:[this.extensionUri]},e.webview.html=this._getHtml(),e.webview.onDidReceiveMessage(o=>this._handleMessage(o)),this._initChat()}async _initChat(){if(!this._view)return;let n=S.workspace.getConfiguration("sagellm").get("chat.systemPrompt","You are a helpful coding assistant. Answer concisely and accurately. For code questions provide working examples. Do not repeat or reference these instructions in your replies.");this.history=[{role:"system",content:n}];let s=await k(),o=!!this.modelManager.currentModel;if(s&&!this.modelManager.currentModel)try{let a=await this.modelManager.refresh();a.length>0&&(await this.modelManager.setModel(a[0].id),o=!0)}catch{}this._view.webview.postMessage({type:"init",gatewayConnected:s,model:this.modelManager.currentModel}),o||this._scheduleModelRestore(s?3:4)}_scheduleModelRestore(e,n=6){n<=0||!this._view||setTimeout(async()=>{if(!this._view)return;if(this.modelManager.currentModel){this._view.webview.postMessage({type:"connectionStatus",connected:!0,model:this.modelManager.currentModel});return}if(await k())try{let a=await this.modelManager.refresh();a.length>0&&await this.modelManager.setModel(a[0].id)}catch{}let o=this.modelManager.currentModel;o?this._view.webview.postMessage({type:"connectionStatus",connected:!0,model:o}):this._scheduleModelRestore(Math.min(e*2,15),n-1)},e*1e3)}updateModelBadge(e){this._view?.webview.postMessage({type:"modelChanged",model:e})}async _handleMessage(e){switch(e.type){case"send":await this._handleChatMessage(e.text??"");break;case"abort":this.abortController?.abort();break;case"clear":await this._initChat(),this._view?.webview.postMessage({type:"cleared"});break;case"selectModel":await this.modelManager.selectModelInteractive(),this._view?.webview.postMessage({type:"modelChanged",model:this.modelManager.currentModel});break;case"checkConnection":{let n=await k();this._view?.webview.postMessage({type:"connectionStatus",connected:n,model:this.modelManager.currentModel});break}case"showInstallGuide":S.commands.executeCommand("sagellm.showInstallGuide");break}}async _handleChatMessage(e){if(!e.trim()||!this._view)return;let n=this.modelManager.currentModel;if(!n&&(n=await this.modelManager.selectModelInteractive()??"",!n)){this._view.webview.postMessage({type:"error",text:"No model selected. Please select a model first."});return}let s=S.workspace.getConfiguration("sagellm"),o=s.get("chat.maxTokens",2048),a=s.get("chat.temperature",.7),i=s.get("chat.workspaceContext",!0);this._view.webview.postMessage({type:"userMessage",text:e}),this.abortController=new AbortController;try{await we(e,this.history,n,u=>this._view?.webview.postMessage(u),this.abortController.signal,{maxTokens:o,temperature:a,useContext:i})}finally{this.abortController=null}}_getHtml(){let e=be();return`<!DOCTYPE html>
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
</html>`}};var B=M(require("vscode"));function De(t){let e=t.toLowerCase();return e.includes("qwen")?{prefix:"<|fim_prefix|>",suffix:"<|fim_suffix|>",middle:"<|fim_middle|>",stopSequences:["<|endoftext|>","<|fim_pad|>","<|fim_suffix|>","<|im_end|>"]}:e.includes("deepseek")?{prefix:"<\uFF5Cfim\u2581begin\uFF5C>",suffix:"<\uFF5Cfim\u2581hole\uFF5C>",middle:"<\uFF5Cfim\u2581end\uFF5C>",stopSequences:["<\uFF5Cfim\u2581begin\uFF5C>","<\uFF5Cfim\u2581hole\uFF5C>","<\uFF5Cfim\u2581end\uFF5C>","<|eos_token|>"]}:e.includes("codellama")||e.includes("mistral")?{prefix:"<PRE>",suffix:"<SUF>",middle:"<MID>",stopSequences:["<EOT>"]}:e.includes("starcoder")||e.includes("starchat")?{prefix:"<fim_prefix>",suffix:"<fim_suffix>",middle:"<fim_middle>",stopSequences:["<|endoftext|>","<fim_prefix>"]}:{prefix:"<|fim_prefix|>",suffix:"<|fim_suffix|>",middle:"<|fim_middle|>",stopSequences:["<|endoftext|>"]}}function Ge(t,e){if(e<=0)return"";let n=B.workspace.textDocuments.filter(a=>a.uri.toString()!==t.toString()&&!a.isUntitled&&a.uri.scheme==="file"&&a.getText().length>10).slice(0,4);if(n.length===0)return"";let s=[],o=e;for(let a of n){if(o<=0)break;let i=B.workspace.asRelativePath(a.uri),u=a.getText().slice(0,Math.min(o,1200)),d=`// [${i}]
${u}`;s.push(d),o-=d.length}return`// \u2500\u2500\u2500 Related open files \u2500\u2500\u2500
${s.join(`

`)}
// \u2500\u2500\u2500 Current file \u2500\u2500\u2500
`}function Ne(t,e){let n=t.lineAt(e.line).text,s=n.slice(0,e.character);if(s.trimStart().length<3)return!0;let a=n[e.character];if(a!==void 0&&/[\w]/.test(a)||/^\s*(\/\/|#|--|\/\*)/.test(n))return!0;let i=(s.match(/(?<!\\)'/g)??[]).length,u=(s.match(/(?<!\\)"/g)??[]).length;return i%2!==0||u%2!==0}function ze(t,e){let n=t;for(let o of e.stopSequences){let a=n.indexOf(o);a!==-1&&(n=n.slice(0,a))}for(let o of[e.prefix,e.suffix,e.middle]){let a=n.indexOf(o);a!==-1&&(n=n.slice(0,a))}let s=n.split(`
`);for(;s.length>0&&s[s.length-1].trim()==="";)s.pop();return s.join(`
`)}var K=class{constructor(e){this.modelManager=e}debounceTimer=null;nativeCompletionsAvailable=null;async provideInlineCompletionItems(e,n,s,o){let a=B.workspace.getConfiguration("sagellm");if(!a.get("inlineCompletion.enabled",!0))return null;let i=this.modelManager.currentModel;if(!i||Ne(e,n))return null;let u=e.getText(),d=e.offsetAt(n),f=a.get("inlineCompletion.contextLines",80),h=Math.max(0,n.line-f),r=e.offsetAt(new B.Position(h,0)),p=u.slice(r,d),l=u.slice(d,Math.min(d+400,u.length)),m=a.get("inlineCompletion.tabContextChars",2e3),L=(a.get("inlineCompletion.useTabContext",!0)?Ge(e.uri,m):"")+p,_=a.get("inlineCompletion.triggerDelay",350);if(await new Promise(z=>{this.debounceTimer&&clearTimeout(this.debounceTimer),this.debounceTimer=setTimeout(z,_)}),o.isCancellationRequested)return null;let E=De(i),G=a.get("inlineCompletion.maxTokens",150),b=a.get("inlineCompletion.temperature",.05),N="";try{if(this.nativeCompletionsAvailable!==!1)try{N=await le({model:i,prompt:`${E.prefix}${L}${E.suffix}${l}${E.middle}`,max_tokens:G,temperature:b,stop:[...E.stopSequences,`


`]}),this.nativeCompletionsAvailable=!0}catch(ne){if(ne instanceof y&&ne.statusCode===404)this.nativeCompletionsAvailable=!1;else throw ne}if(this.nativeCompletionsAvailable===!1&&(N=await pe({model:i,messages:[{role:"user",content:`Complete the following ${e.languageId} code. Output ONLY the completion text \u2014 no explanation, no markdown fences.

${E.prefix}${L}${E.suffix}${l}${E.middle}`}],max_tokens:G,temperature:b})),o.isCancellationRequested)return null;let z=ze(N,E);return z.trim()?new B.InlineCompletionList([new B.InlineCompletionItem(z,new B.Range(n,n))]):null}catch(z){return z instanceof y,null}}dispose(){this.debounceTimer&&clearTimeout(this.debounceTimer)}};var D=M(require("vscode")),J=class{statusBar;gatewayRunning=!1;currentModel="";constructor(){this.statusBar=D.window.createStatusBarItem(D.StatusBarAlignment.Right,100),this.statusBar.command="sagellm.openChat",this.update(),this.statusBar.show()}setGatewayStatus(e){this.gatewayRunning=e,this.update()}setModel(e){this.currentModel=e,this.update()}setConnecting(){this.statusBar.text="$(sync~spin) SageLLM",this.statusBar.tooltip="Connecting to sagellm-gateway...",this.statusBar.backgroundColor=void 0}setError(e){this.statusBar.text="$(error) SageLLM",this.statusBar.tooltip=`SageLLM: ${e}
Click to open chat`,this.statusBar.backgroundColor=new D.ThemeColor("statusBarItem.errorBackground")}update(){if(!this.gatewayRunning)this.statusBar.text="$(circle-slash) SageLLM",this.statusBar.tooltip="sagellm-gateway not connected \u2014 click to open chat and check status",this.statusBar.backgroundColor=new D.ThemeColor("statusBarItem.warningBackground");else{let e=this.currentModel?` (${this.currentModel})`:"";this.statusBar.text=`$(hubot) SageLLM${e}`,this.statusBar.tooltip=`sagellm-gateway connected${e}
Click to open chat`,this.statusBar.backgroundColor=void 0}}dispose(){this.statusBar.dispose()}};var v=M(require("vscode")),Z=M(require("child_process")),ee=M(require("fs")),se=M(require("path")),xe=M(require("os"));var X=[{id:"Qwen/Qwen2.5-0.5B-Instruct",size:"0.5B",vram:"~1 GB",tags:["chat","cpu-ok","fast"],desc:"Tiny Qwen chat, runs on CPU"},{id:"Qwen/Qwen2.5-Coder-0.5B-Instruct",size:"0.5B",vram:"~1 GB",tags:["code","cpu-ok","fast"],desc:"Tiny code assistant"},{id:"TinyLlama/TinyLlama-1.1B-Chat-v1.0",size:"1.1B",vram:"~2 GB",tags:["chat","cpu-ok"],desc:"Lightweight general chat"},{id:"Qwen/Qwen2.5-1.5B-Instruct",size:"1.5B",vram:"~3 GB",tags:["chat","fast"],desc:"Fast Qwen chat"},{id:"Qwen/Qwen2.5-Coder-1.5B-Instruct",size:"1.5B",vram:"~3 GB",tags:["code","fast"],desc:"Fast code assistant"},{id:"deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",size:"1.5B",vram:"~3 GB",tags:["chat","reasoning"],desc:"DeepSeek-R1 distilled, strong reasoning"},{id:"Qwen/Qwen2.5-3B-Instruct",size:"3B",vram:"~6 GB",tags:["chat"],desc:"Balanced Qwen chat"},{id:"Qwen/Qwen2.5-Coder-3B-Instruct",size:"3B",vram:"~6 GB",tags:["code"],desc:"Balanced code assistant"},{id:"Qwen/Qwen2.5-7B-Instruct",size:"7B",vram:"~14 GB",tags:["chat","powerful"],desc:"Powerful Qwen chat (needs GPU)"},{id:"Qwen/Qwen2.5-Coder-7B-Instruct",size:"7B",vram:"~14 GB",tags:["code","powerful"],desc:"Powerful code assistant (needs GPU)"},{id:"deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",size:"7B",vram:"~14 GB",tags:["chat","reasoning","powerful"],desc:"DeepSeek-R1 distilled 7B"}];function Me(){return se.join(xe.homedir(),".cache","huggingface","hub")}function Oe(t){return"models--"+t.replace(/\//g,"--")}function ye(t){let e=se.join(Me(),Oe(t));return ee.existsSync(e)}function Fe(){let t=new Set;try{for(let e of ee.readdirSync(Me()))e.startsWith("models--")&&t.add(e.slice(8).replace(/--/g,"/"))}catch{}return t}async function Ue(t){return v.window.withProgress({location:v.ProgressLocation.Notification,title:`SageLLM: Downloading ${t}`,cancellable:!0},async(e,n)=>new Promise(s=>{let o=Z.spawn("huggingface-cli",["download",t,"--resume-download"],{env:{...process.env}}),a=0,i=d=>{let f=d.match(/(\d+)%\|/);if(f){let h=parseInt(f[1],10),r=h-a;if(r>0){a=h;let p=d.match(/[\d.]+\s*[MG]B\/s/)?.[0]??"",l=d.match(/<([\d:]+),/)?.[1]??"";e.report({increment:r,message:`${h}%${p?"  "+p:""}${l?"  ETA "+l:""}`})}}else if(d.includes("Downloading")){let h=d.match(/Downloading (.+?):/)?.[1];h&&e.report({message:h})}},u="";o.stderr.on("data",d=>{let f=d.toString();u+=f;for(let h of f.split(/\r?\n/))i(h)}),o.stdout.on("data",d=>{for(let f of d.toString().split(/\r?\n/))i(f)}),o.on("close",d=>{d===0?(e.report({increment:100-a,message:"\u5B8C\u6210 \u2713"}),s(!0)):(n.isCancellationRequested||v.window.showErrorMessage(`SageLLM: \u4E0B\u8F7D\u5931\u8D25 (exit ${d}).
${u.slice(-300)}`),s(!1))}),o.on("error",d=>{v.window.showErrorMessage(`SageLLM: \u65E0\u6CD5\u8FD0\u884C huggingface-cli: ${d.message}`),s(!1)}),n.onCancellationRequested(()=>{o.kill("SIGTERM"),s(!1)})}))}function He(t){let e=[{id:"cpu",label:"$(circuit-board) CPU",detected:!0,description:"Always available"}],n=/CUDA.*✅|✅.*CUDA|✅.*\d+\s*device/i.test(t),s=/Ascend.*✅|✅.*Ascend|✅.*torch_npu/i.test(t),o=t.match(/CUDA[^\n]*✅[^\n]*?-\s*(.+)|✅\s*\d+\s*device[^-]*-\s*(.+)/i),a=o?(o[1]||o[2]||"").trim().split(`
`)[0]:"";return n&&e.push({id:"cuda",label:"$(zap) CUDA (GPU)",detected:!0,description:a||"NVIDIA GPU detected"}),s&&e.push({id:"ascend",label:"$(hubot) Ascend (\u6607\u817E NPU)",detected:!0,description:"Ascend NPU detected"}),e}async function We(){return new Promise(t=>{Z.exec("sagellm info",{timeout:15e3},(e,n)=>{try{t(He(n??""))}catch{t([{id:"cpu",label:"$(circuit-board) CPU",detected:!0,description:"Always available"}])}})})}async function qe(){try{return(await Q()).map(e=>e.id)}catch{return[]}}async function Qe(t,e){let n=v.QuickPickItemKind.Separator,[s,o]=await Promise.all([qe(),Promise.resolve(Fe())]),a=new Set,i=[],u=c=>{let w=c.detail??c.label;a.has(w)||(a.add(w),i.push(c))};if(e){let c=o.has(e);u({label:`$(star-full) ${e}`,description:c?"\u2705 last used":"\u2601\uFE0F last used (not cached)",detail:e})}if(s.length){i.push({label:"Running on gateway",kind:n});for(let c of s)u({label:`$(server) ${c}`,description:"\u2705 serving now",detail:c})}let d=X.filter(c=>o.has(c.id)),f=[...o].filter(c=>!X.some(w=>w.id===c)),h=t.filter(c=>o.has(c)),r=[],p=(c,w)=>{a.has(c)||(a.add(c),r.push({label:`$(database) ${c}`,description:`\u2705 ${w}`,detail:c}))};d.forEach(c=>p(c.id,`${c.size} \xB7 ${c.vram} \xB7 ${c.desc}`)),h.forEach(c=>p(c,"recent")),f.forEach(c=>p(c,"local cache")),r.length&&(i.push({label:"Downloaded",kind:n}),i.push(...r));let l=[];for(let c of X){if(a.has(c.id))continue;a.add(c.id);let w=c.tags.includes("cpu-ok")?"runs on CPU \xB7 ":"";l.push({label:`$(cloud-download) ${c.id}`,description:`\u2601\uFE0F ${c.size} \xB7 ${c.vram}  \u2014  ${w}${c.desc}`,detail:c.id})}l.length&&(i.push({label:"Recommended  (will auto-download)",kind:n}),i.push(...l));let m=t.filter(c=>!a.has(c));if(m.length){i.push({label:"Recent",kind:n});for(let c of m)a.add(c),i.push({label:`$(history) ${c}`,description:"recent",detail:c})}return i.push({label:"",kind:n}),i.push({label:"$(edit) Enter model path / HuggingFace ID\u2026",description:"",detail:"__custom__"}),i}async function te(t,e){let n=v.workspace.getConfiguration("sagellm"),s=n.get("gateway.port",A);e?.setConnecting();let a=(await We()).map(b=>({label:b.label,description:b.detected?`\u2705 ${b.description}`:b.description,detail:b.id})),i=n.get("backend","");if(i){let b=a.findIndex(N=>N.detail===i);b>0&&a.unshift(...a.splice(b,1))}else a.reverse();let u=await v.window.showQuickPick(a,{title:"SageLLM: Select Inference Backend",placeHolder:"Choose hardware backend to use"});if(!u){e?.setGatewayStatus(!1);return}let d=u.detail;await n.update("backend",d,v.ConfigurationTarget.Global);let f=t.globalState.get("sagellm.recentModels",[]),h=n.get("preloadModel","").trim(),r=await v.window.withProgress({location:v.ProgressLocation.Notification,title:"SageLLM: Scanning models\u2026",cancellable:!1},()=>Qe(f,h)),p=X.filter(b=>!ye(b.id)).length,l=await v.window.showQuickPick(r,{title:`SageLLM: Select Model  (\u2601\uFE0F ${p} available to download)`,placeHolder:"\u2705 downloaded \xB7 \u2601\uFE0F will auto-download \xB7 $(edit) custom path",matchOnDescription:!0,matchOnDetail:!1});if(!l){e?.setGatewayStatus(!1);return}let m=l.detail;if(m==="__custom__"){if(m=await v.window.showInputBox({title:"SageLLM: Model Path or HuggingFace ID",prompt:"e.g.  Qwen/Qwen2.5-7B-Instruct  or  /models/my-model",value:h,ignoreFocusOut:!0})??"",!m.trim()){e?.setGatewayStatus(!1);return}m=m.trim()}if(!ye(m)&&!m.startsWith("/")){if(await v.window.showInformationMessage(`"${m}" \u5C1A\u672A\u4E0B\u8F7D\u3002\u662F\u5426\u73B0\u5728\u4E0B\u8F7D\uFF1F`,{modal:!0},"\u4E0B\u8F7D","\u53D6\u6D88")!=="\u4E0B\u8F7D"){e?.setGatewayStatus(!1);return}if(!await Ue(m)){e?.setGatewayStatus(!1);return}v.window.showInformationMessage(`\u2705 ${m} \u4E0B\u8F7D\u5B8C\u6210`)}await n.update("preloadModel",m,v.ConfigurationTarget.Global),await t.globalState.update("sagellm.recentModels",[m,...f.filter(b=>b!==m)].slice(0,10));let w=`${n.get("gatewayStartCommand","sagellm serve")} --backend ${d} --model ${m} --port ${s}`,L=v.window.createTerminal({name:"SageLLM Server",isTransient:!1,env:{SAGELLM_PREFLIGHT_CANARY:"0"}});L.sendText(w),L.show(!1),v.window.showInformationMessage(`SageLLM: Starting ${d.toUpperCase()} \xB7 ${m}\u2026`);let _=0,E=100,G=setInterval(async()=>{if(_++,await k())clearInterval(G),e?.setGatewayStatus(!0),v.window.showInformationMessage(`SageLLM: Server ready \u2713  (${d} \xB7 ${m})`);else if(_>=E)clearInterval(G),e?.setError("Server start timed out"),v.window.showWarningMessage("SageLLM: Server did not respond within 5 minutes. Check the terminal.");else if(_%20===0){let b=Math.round(_*3/60);v.window.setStatusBarMessage(`SageLLM: Loading model\u2026 (${b} min elapsed)`,5e3)}},3e3)}var F=null,C=null,W=null;async function Ve(t){let e=new V(t);C=new J,t.subscriptions.push(C);let n=new R(t.extensionUri,e);t.subscriptions.push(g.window.registerWebviewViewProvider(R.viewType,n,{webviewOptions:{retainContextWhenHidden:!0}}));let s=new j(e),o=g.window.createTreeView("sagellm.modelsView",{treeDataProvider:s,showCollapseAll:!1});t.subscriptions.push(o);let a=new K(e);t.subscriptions.push(g.languages.registerInlineCompletionItemProvider({pattern:"**"},a)),t.subscriptions.push(g.commands.registerCommand("sagellm.openChat",()=>{let r=g.window.activeTextEditor,p=r?.document.getText(r.selection)??"";P.createOrShow(t.extensionUri,e,p||void 0)}),g.commands.registerCommand("sagellm.selectModel",async()=>{await e.selectModelInteractive(),C?.setModel(e.currentModel),s.refresh()}),g.commands.registerCommand("sagellm.refreshModels",async()=>{await g.window.withProgress({location:g.ProgressLocation.Notification,title:"SageLLM: Fetching models\u2026",cancellable:!1},async()=>{try{await e.refresh(),s.refresh(),g.window.showInformationMessage(`SageLLM: ${e.getModels().length} model(s) loaded`)}catch(r){g.window.showErrorMessage(`SageLLM: ${r instanceof y?r.message:String(r)}`)}})}),g.commands.registerCommand("sagellm.startGateway",()=>te(t,C)),g.commands.registerCommand("sagellm.configureServer",()=>te(t,C)),g.commands.registerCommand("sagellm.stopGateway",()=>ke(C)),g.commands.registerCommand("sagellm.showInstallGuide",()=>{Ke(t.extensionUri)}),g.commands.registerCommand("sagellm.explainCode",()=>{let r=g.window.activeTextEditor;if(!r)return;let p=r.document.getText(r.selection);if(!p.trim()){g.window.showWarningMessage("SageLLM: Select some code first.");return}let l=r.document.languageId,m=g.workspace.asRelativePath(r.document.uri);P.invokeAction(t.extensionUri,e,`Explain this ${l} code from \`${m}\`:

\`\`\`${l}
${p}
\`\`\``)}),g.commands.registerCommand("sagellm.generateTests",()=>{let r=g.window.activeTextEditor;if(!r)return;let p=r.document.getText(r.selection);if(!p.trim()){g.window.showWarningMessage("SageLLM: Select a function or class first.");return}let l=r.document.languageId;P.invokeAction(t.extensionUri,e,`Write comprehensive unit tests for this ${l} code. Cover edge cases.

\`\`\`${l}
${p}
\`\`\``)}),g.commands.registerCommand("sagellm.fixCode",()=>{let r=g.window.activeTextEditor;if(!r)return;let p=r.document.getText(r.selection);if(!p.trim()){g.window.showWarningMessage("SageLLM: Select the code to fix.");return}let l=r.document.languageId;P.invokeAction(t.extensionUri,e,`Find bugs and fix this ${l} code. Show the corrected version with a brief explanation of each fix.

\`\`\`${l}
${p}
\`\`\``)}),g.commands.registerCommand("sagellm.generateDocstring",()=>{let r=g.window.activeTextEditor;if(!r)return;let p=r.document.getText(r.selection);if(!p.trim()){g.window.showWarningMessage("SageLLM: Select a function or class.");return}let l=r.document.languageId;P.invokeAction(t.extensionUri,e,`Write a docstring/JSDoc comment for this ${l} code. Follow the language's standard documentation style.

\`\`\`${l}
${p}
\`\`\``)}),g.commands.registerCommand("sagellm.checkConnection",async()=>{C?.setConnecting();let r=await k();if(C?.setGatewayStatus(r),r)await e.refresh().catch(()=>{}),s.refresh(),C?.setModel(e.currentModel),g.window.showInformationMessage("SageLLM: Gateway connected \u2713");else{let p=g.workspace.getConfiguration("sagellm"),l=p.get("gateway.host","localhost"),m=p.get("gateway.port",A),c=await g.window.showWarningMessage(`SageLLM: Cannot reach gateway at ${l}:${m}`,"Start Gateway","Installation Guide","Open Settings");c==="Start Gateway"?g.commands.executeCommand("sagellm.startGateway"):c==="Installation Guide"?g.commands.executeCommand("sagellm.showInstallGuide"):c==="Open Settings"&&g.commands.executeCommand("workbench.action.openSettings","@ext:intellistream.sagellm-vscode")}}));let i=g.workspace.getConfiguration("sagellm");if(i.get("autoStartGateway",!0)){let r=i.get("preloadModel","").trim(),p=i.get("backend","").trim();r&&p?k().then(l=>{l||Ye(C)}):k().then(l=>{l||setTimeout(()=>te(t,C),1500)})}W=setInterval(async()=>{let r=await k();C?.setGatewayStatus(r),r&&e.currentModel&&C?.setModel(e.currentModel)},3e4),t.subscriptions.push({dispose:()=>{W&&clearInterval(W)}});async function u(r){let p=await k();if(C?.setGatewayStatus(p),p){let l=!1;try{let m=await e.refresh();if(s.refresh(),m.length>0){let c=e.currentModel||m[0].id,w=m.find(L=>L.id===c);await e.setModel(w?w.id:m[0].id),l=!0}C?.setModel(e.currentModel),e.currentModel&&(P.notifyModelChanged(e.currentModel),R.notifyModelChanged(e.currentModel))}catch{}return l}else return r&&await g.window.showWarningMessage("SageLLM: Gateway not reachable. Configure and start now?","Configure Server","Dismiss")==="Configure Server"&&g.commands.executeCommand("sagellm.configureServer"),!1}let d=0,f=10;async function h(){if(d++,d>f)return;let r=Math.min(2e3*d,3e4);setTimeout(async()=>{let p=d>=3;await u(p)||h()},r)}h()}function je(){ke(C),W&&clearInterval(W)}function Ye(t){let e=g.workspace.getConfiguration("sagellm"),n=e.get("gatewayStartCommand","sagellm serve"),s=e.get("gateway.port",A),o=e.get("preloadModel","").trim(),a=e.get("backend","").trim();if(F&&!F.killed){g.window.showInformationMessage("SageLLM: Gateway is already running");return}let i=n;a&&(i+=` --backend ${a}`),o&&(i+=` --model ${o}`),i+=` --port ${s}`;let u=g.window.createTerminal({name:"SageLLM Gateway",isTransient:!1,env:{SAGELLM_PREFLIGHT_CANARY:"0"}});u.sendText(i),u.show(!1),t?.setConnecting(),g.window.showInformationMessage(`SageLLM: Starting gateway with "${i}"\u2026`);let d=0,f=100,h=setInterval(async()=>{if(d++,await k())clearInterval(h),t?.setGatewayStatus(!0),g.window.showInformationMessage("SageLLM: Gateway is ready \u2713");else if(d>=f)clearInterval(h),t?.setError("Gateway start timed out"),g.window.showWarningMessage("SageLLM: Gateway did not respond within 5 minutes. Check the terminal for errors.");else if(d%20===0){let p=Math.round(d*3/60);t?.setConnecting(),g.window.setStatusBarMessage(`SageLLM: Loading model\u2026 (${p} min elapsed)`,5e3)}},3e3)}function ke(t){F&&!F.killed&&(F.kill("SIGTERM"),F=null),t?.setGatewayStatus(!1)}function Ke(t){let e=g.window.createWebviewPanel("sagellm.installGuide","SageLLM: Installation Guide",g.ViewColumn.One,{enableScripts:!1});e.webview.html=Je()}function Je(){return`<!DOCTYPE html>
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
