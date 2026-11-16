// Totaux mensuels du calendrier — texte identique dans le mono (index.html).
function totauxCalendrier(cal){
  let mois=Array.from({length:12},(_,m)=>({month:m,ouvres:0,vacances:0,samedis:0,dimanches:0,feries:0,jours:0,san:0,sai:0,tp:0,ca:0}));
  (cal||[]).forEach(function(d){
    let t=mois[d.month];if(!t)return;
    t.jours++;
    if(d.type==='ferie')t.feries++;else if(d.type==='dimanche')t.dimanches++;else if(d.type==='samedi')t.samedis++;else if(d.type==='vacances')t.vacances++;else t.ouvres++;
    let c=d.ca||{};t.san+=+c.san||0;t.sai+=+c.sai||0;t.tp+=+c.tp||0;t.ca+=+d.total||0;
  });
  let total={month:-1,ouvres:0,vacances:0,samedis:0,dimanches:0,feries:0,jours:0,san:0,sai:0,tp:0,ca:0};
  mois.forEach(function(t){Object.keys(total).forEach(function(k){if(k!=='month')total[k]+=t[k]})});
  mois.forEach(function(t){t.part=total.ca?t.ca/total.ca:0;t.moyJour=t.jours?t.ca/t.jours:0});
  total.part=total.ca?1:0;total.moyJour=total.jours?total.ca/total.jours:0;
  return {mois:mois,total:total};
}

export { totauxCalendrier };
