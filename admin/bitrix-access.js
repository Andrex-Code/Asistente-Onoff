const accessForm=document.getElementById('bitrixAccessForm');
const revokeForm=document.getElementById('bitrixRevokeForm');
const accessOutput=document.getElementById('bitrixAccessOutput');
const accessStatus=document.getElementById('bitrixAccessStatus');

async function changeBitrixAccess(form, method, body){
  const button=form.querySelector('button');
  if(button.disabled) return;
  button.disabled=true;
  setStatus(accessStatus,'Procesando…');
  try{
    const response=await fetch('/api/admin/bitrix-access',{
      method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
    });
    const result=await safeJson(response);
    if(response.status===401){showLogin();return;}
    if(!response.ok||!result?.ok) throw Error(result?.error||'No se pudo actualizar el acceso.');
    if(method==='POST'){
      document.getElementById('bitrixIssuedCode').value=result.code;
      document.getElementById('bitrixIssuedReference').value=result.reference;
      document.getElementById('bitrixRevokeReference').value=result.reference;
      accessOutput.hidden=false;
      setStatus(accessStatus,'Código válido por 24 horas. Entrega el código al asesor y conserva la referencia.','success');
    }else{
      accessOutput.hidden=true;
      document.getElementById('bitrixIssuedCode').value='';
      document.getElementById('bitrixIssuedReference').value='';
      setStatus(accessStatus,'Acceso revocado.','success');
    }
  }catch(error){setStatus(accessStatus,error.message,'error');}
  finally{button.disabled=false;}
}
accessForm.addEventListener('submit',event=>{event.preventDefault();void changeBitrixAccess(accessForm,'POST',{});});
revokeForm.addEventListener('submit',event=>{
  event.preventDefault();
  void changeBitrixAccess(revokeForm,'DELETE',{reference:document.getElementById('bitrixRevokeReference').value.trim()});
});
document.getElementById('logoutButton').addEventListener('click',()=>{
  accessOutput.hidden=true;
  document.getElementById('bitrixIssuedCode').value='';
  document.getElementById('bitrixIssuedReference').value='';
});
