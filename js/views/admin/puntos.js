import { state } from '../../state.js';
import { calcPoints, calcSpecialPoints } from '../../helpers.js';
import { predictionsRef, specialPredsRef, usersRef } from '../../firebase.js';

export async function recalculatePointsForMatch(matchId,matchWithResult){
  const snap=await predictionsRef.once("value");
  const allP=snap.val()||{};
  for(const uid of Object.keys(allP)){
    const pred=allP[uid][matchId];
    if(pred&&pred.local!=null&&pred.visitante!=null)
      await predictionsRef.child(uid).child(matchId).child("puntos").set(calcPoints(pred,matchWithResult));
  }
  await recalculateAllUserPoints();
}

export async function recalculateAllUserPoints(){
  const[predSnap,specSnap]=await Promise.all([predictionsRef.once("value"),specialPredsRef.once("value")]);
  const allP=predSnap.val()||{},allS=specSnap.val()||{};
  const updates={};
  Object.keys(state.allUsers).forEach(uid=>{
    if(state.allUsers[uid].role==="admin"){updates[`${uid}/puntos_total`]=0;return}
    let total=0;
    Object.values(allP[uid]||{}).forEach(p=>{if(typeof p.puntos==="number")total+=p.puntos});
    const sp=allS[uid];if(sp&&typeof sp.puntos==="number")total+=sp.puntos;
    updates[`${uid}/puntos_total`]=total;
  });
  await usersRef.update(updates);
}

export async function recalculateSpecialPoints(cfg){
  const snap=await specialPredsRef.once("value");
  const all=snap.val()||{};
  const updates={};
  Object.entries(all).forEach(([uid,pred])=>{updates[`${uid}/puntos`]=calcSpecialPoints(pred,cfg)});
  if(Object.keys(updates).length>0) await specialPredsRef.update(updates);
}
