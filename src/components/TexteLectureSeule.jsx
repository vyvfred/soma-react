import { useBudget } from '../context/BudgetContext.jsx';
// Texte du bandeau « lecture seule » : consultation (valideur, directeur financier) ou budget engagé dans le circuit de validation
export default function TexteLectureSeule() {
  const { lectureSeule } = useBudget();
  return lectureSeule ? '🔒 Consultation — lecture seule.' : '🔒 Budget engagé dans le circuit de validation — lecture seule.';
}
