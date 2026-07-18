from pathlib import Path

path = Path("apps/swappys-mobile/src/SwappysWebApp.ts")
text = path.read_text()


def patch(old: str, new: str) -> None:
    global text
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"SwappysWebApp expected one match for {old[:120]!r}, found {count}")
    text = text.replace(old, new, 1)


patch(
    '''.upgrade{display:none}.upgrade.show{display:block}.small{font-size:10px;color:#8f9abb;line-height:1.4;margin-top:7px}''',
    '''.upgrade{display:none}.upgrade.show{display:block}.destination{display:none}.destination.show{display:block}.destination select{width:100%;margin-top:7px;border:1px solid #ffffff25;border-radius:11px;background:#111525;color:#fff;padding:11px;font-size:12px}.destination label{display:block;margin-top:9px;font-size:10px;color:#aeb8d1}.small{font-size:10px;color:#8f9abb;line-height:1.4;margin-top:7px}''',
)

patch(
    '''<div class="panel account"><div><strong id="accountTitle">Preview access</strong><span id="accountText">Connect Virelle to apply your subscription and BYOK settings.</span></div><button class="btn gold" id="accountBtn" onclick="toggleAccount()">Connect</button></div>
<div class="panel">''',
    '''<div class="panel account"><div><strong id="accountTitle">Preview access</strong><span id="accountText">Connect Virelle to apply your subscription and BYOK settings.</span></div><button class="btn gold" id="accountBtn" onclick="toggleAccount()">Connect</button></div>
<div class="panel destination" id="destinationPanel"><strong>Virelle production destination</strong><p class="small">Choose where authenticated results should be stored. The result is saved into the selected scene's VFX data and Swappys export history.</p><label for="projectSelect">Project</label><select id="projectSelect" onchange="onProjectChange()"><option value="">Select a project</option></select><label for="sceneSelect">Scene</label><select id="sceneSelect" onchange="updateVirelleSaveButton()" disabled><option value="">Select a project first</option></select><div class="small" id="destinationStatus"></div></div>
<div class="panel">''',
)

patch(
    '''<div class="result" id="result"><img id="resultImage" alt="AI transformation result"/><div class="watermark" id="resultWatermark">SWAPPYS PREVIEW · virelle.life</div><div class="controls"><button class="btn gold" onclick="saveResult()">Save</button><button class="btn" onclick="doSwap()">Try again</button><button class="btn danger" onclick="clearResult()">Delete</button></div><button class="btn" style="width:100%;margin-top:8px" onclick="openVirelleWorkflow()">Continue in Virelle production workflow</button></div>''',
    '''<div class="result" id="result"><img id="resultImage" alt="AI transformation result"/><div class="watermark" id="resultWatermark">SWAPPYS PREVIEW · virelle.life</div><div class="controls"><button class="btn gold" onclick="saveResult()">Save to Photos</button><button class="btn" onclick="doSwap()">Try again</button><button class="btn danger" onclick="clearResult()">Delete</button></div><button class="btn primary" id="saveVirelleBtn" style="width:100%;margin-top:8px" onclick="saveToVirelle()" disabled>Save to selected Virelle scene</button><button class="btn" style="width:100%;margin-top:8px" onclick="openVirelleWorkflow()">Open full Virelle production workflow</button></div>''',
)

patch(
    '''let sourceData=null,targetData=null,stream=null,virelleBaseUrl='https://virelle.life',virelleOk=false,busy=false,authenticated=Boolean(${tokenJson});
const authToken=${tokenJson};''',
    '''let sourceData=null,targetData=null,stream=null,virelleBaseUrl='https://virelle.life',virelleOk=false,busy=false,authenticated=Boolean(${tokenJson}),destinations=[],currentResultToken=null;
const authToken=${tokenJson};''',
)

patch(
    '''window.SwappysNative={setVirelleConnection(payload){virelleOk=Boolean(payload&&payload.ok);authenticated=Boolean(payload&&payload.authenticated)||Boolean(authToken);if(payload&&payload.baseUrl)virelleBaseUrl=payload.baseUrl;updateAccount();setStatus(payload.health||(virelleOk?'Virelle AI online':'Virelle AI unavailable'),virelleOk?'ok':'err');updateSwapButton();}};''',
    '''window.SwappysNative={setVirelleConnection(payload){virelleOk=Boolean(payload&&payload.ok);authenticated=Boolean(payload&&payload.authenticated)||Boolean(authToken);if(payload&&payload.baseUrl)virelleBaseUrl=payload.baseUrl;updateAccount();setStatus(payload.health||(virelleOk?'Virelle AI online':'Virelle AI unavailable'),virelleOk?'ok':'err');updateSwapButton();if(authenticated)loadDestinations();}};''',
)

patch(
    '''function updateAccount(){document.getElementById('accountTitle').textContent=authenticated?'Virelle account connected':'Preview access';document.getElementById('accountText').textContent=authenticated?'Subscription and BYOK entitlements will be checked on each request.':'Connect Virelle to apply your subscription and BYOK settings.';document.getElementById('accountBtn').textContent=authenticated?'Disconnect':'Connect';}''',
    '''function updateAccount(){document.getElementById('accountTitle').textContent=authenticated?'Virelle account connected':'Preview access';document.getElementById('accountText').textContent=authenticated?'Subscription, BYOK and production destinations are available.':'Connect Virelle to apply your subscription and BYOK settings.';document.getElementById('accountBtn').textContent=authenticated?'Disconnect':'Connect';document.getElementById('destinationPanel').classList.toggle('show',authenticated);if(!authenticated){destinations=[];currentResultToken=null;}}''',
)

helpers = '''
async function trpcRequest(procedure,input,method='POST'){const headers={'Content-Type':'application/json'};if(authToken)headers.Authorization='Bearer '+authToken;let response;if(method==='GET'){const query=encodeURIComponent(JSON.stringify({json:input||{}}));response=await fetch(virelleBaseUrl+'/api/trpc/'+procedure+'?input='+query,{method:'GET',headers});}else{response=await fetch(virelleBaseUrl+'/api/trpc/'+procedure,{method:'POST',headers,body:JSON.stringify({json:input||{}})});}let data=null;try{data=await response.json();}catch{}if(!response.ok)throw new Error(data?.error?.json?.message||data?.error?.message||'Virelle request failed.');return data?.result?.data?.json??data?.result?.data;}
async function loadDestinations(){if(!authenticated||!authToken)return;const status=document.getElementById('destinationStatus');status.textContent='Loading productions…';try{const data=await trpcRequest('vfxSfx.swappysMobileDestinations',{},'GET');destinations=Array.isArray(data?.projects)?data.projects:[];const project=document.getElementById('projectSelect');project.innerHTML='<option value="">Select a project</option>'+destinations.map(item=>'<option value="'+item.id+'">'+escapeHtml(item.title||('Project '+item.id))+'</option>').join('');document.getElementById('sceneSelect').innerHTML='<option value="">Select a project first</option>';document.getElementById('sceneSelect').disabled=true;status.textContent=destinations.length?'Choose a project and scene.':'No Virelle projects are available yet.';}catch(error){status.textContent=error.message||'Could not load Virelle projects.';}}
function escapeHtml(value){return String(value||'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
function onProjectChange(){const projectId=Number(document.getElementById('projectSelect').value||0);const project=destinations.find(item=>Number(item.id)===projectId);const scene=document.getElementById('sceneSelect');const scenes=project&&Array.isArray(project.scenes)?project.scenes:[];scene.innerHTML='<option value="">Select a scene</option>'+scenes.map(item=>'<option value="'+item.id+'">'+escapeHtml('Scene '+(Number(item.orderIndex||0)+1)+' — '+(item.title||'Untitled'))+'</option>').join('');scene.disabled=!project||scenes.length===0;document.getElementById('destinationStatus').textContent=project&&scenes.length===0?'This project has no scenes yet.':'';updateVirelleSaveButton();}
function updateVirelleSaveButton(){const projectId=Number(document.getElementById('projectSelect').value||0);const sceneId=Number(document.getElementById('sceneSelect').value||0);document.getElementById('saveVirelleBtn').disabled=!authenticated||!currentResultToken||!projectId||!sceneId;}
async function saveToVirelle(){const projectId=Number(document.getElementById('projectSelect').value||0);const sceneId=Number(document.getElementById('sceneSelect').value||0);if(!currentResultToken||!projectId||!sceneId)return;const button=document.getElementById('saveVirelleBtn');button.disabled=true;button.textContent='Saving to Virelle…';try{await trpcRequest('vfxSfx.swappysMobileSaveResult',{resultToken:currentResultToken,projectId,sceneId});setStatus('Saved to the selected Virelle scene.','ok');button.textContent='Saved to Virelle';}catch(error){setStatus(error.message||'Could not save to Virelle.','err');button.textContent='Save to selected Virelle scene';updateVirelleSaveButton();}}
'''

if "async function trpcRequest(" not in text:
    marker = "function updateSwapButton(){"
    if marker not in text:
        raise SystemExit("SwappysWebApp helper insertion marker missing")
    text = text.replace(marker, helpers + marker, 1)

patch(
    '''const result=data?.result?.data?.json??data?.result?.data;if(!result?.imageUrl)throw new Error('No output image was returned.');document.getElementById('resultImage').src=result.imageUrl;''',
    '''const result=data?.result?.data?.json??data?.result?.data;if(!result?.imageUrl)throw new Error('No output image was returned.');currentResultToken=result.resultToken||null;document.getElementById('resultImage').src=result.imageUrl;''',
)

patch(
    '''document.getElementById('upgrade').classList.toggle('show',result.hasWatermark!==false);setStatus('Transformation complete.','ok');''',
    '''document.getElementById('upgrade').classList.toggle('show',result.hasWatermark!==false);updateVirelleSaveButton();setStatus('Transformation complete.','ok');''',
)

patch(
    '''function clearResult(){document.getElementById('result').classList.remove('show');document.getElementById('resultImage').removeAttribute('src');document.getElementById('upgrade').classList.remove('show');}''',
    '''function clearResult(){currentResultToken=null;document.getElementById('result').classList.remove('show');document.getElementById('resultImage').removeAttribute('src');document.getElementById('upgrade').classList.remove('show');document.getElementById('saveVirelleBtn').textContent='Save to selected Virelle scene';updateVirelleSaveButton();}''',
)

path.write_text(text)
