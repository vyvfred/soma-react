// Perspectives & contexte 2027 (nov. 2026) : première étape OBLIGATOIRE de l'Objectif, rédigée par le REX
// avant de fixer son TXR cible et son objectif de CA ; exigée pour soumettre le budget.
const CONTEXTE_MIN_CARACTERES = 80;
function contexteRedige(a){return !!a&&String(a.perspectives||'').trim().length>=CONTEXTE_MIN_CARACTERES;}
function contexteManque(a){return Math.max(0,CONTEXTE_MIN_CARACTERES-String((a&&a.perspectives)||'').trim().length);}
export { CONTEXTE_MIN_CARACTERES, contexteRedige, contexteManque };
