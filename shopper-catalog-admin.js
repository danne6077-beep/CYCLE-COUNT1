(()=>{
 const host=document.querySelector('.utility-actions');if(!host)return;
 const button=document.createElement('button');button.type='button';button.className='nav-button muted';button.id='shopperCatalogBtn';button.dataset.adminOnly='true';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16l-2 14H6L4 7M8 8V6a4 4 0 0 1 8 0v2"/></svg><span>Shopper Catalog</span>';
 host.append(button);
 const modal=document.createElement('dialog');modal.style.cssText='width:min(1180px,96vw);height:92vh;padding:0;border:1px solid #dfe5e1;border-radius:16px;overflow:hidden;';modal.setAttribute('aria-label','Shopper catalog publishing workspace');
 const close=document.createElement('button');close.textContent='Close catalog workspace';close.style.cssText='width:100%;height:44px;background:#065f46;color:white;border:0;cursor:pointer;font:600 12px sans-serif;';close.onclick=()=>modal.close();modal.append(close);
 const frame=document.createElement('iframe');frame.title='FUJI shopper catalog workspace';frame.style.cssText='width:100%;height:calc(100% - 44px);border:0;';modal.append(frame);document.body.append(modal);
 button.onclick=()=>{if(window.fujiCurrentUser?.role!=='admin'){window.toast?.('Administrator access is required.');return;}frame.src='./shopper/staff.html';modal.showModal();};
 const update=()=>{button.disabled=window.fujiCurrentUser?.role!=='admin';};document.addEventListener('authchange',update);update();
 if(new URLSearchParams(location.search).has('shopper-catalog'))document.addEventListener('authchange',()=>{if(window.fujiCurrentUser?.role==='admin')button.click();},{once:true});
})();
