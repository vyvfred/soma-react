// Registre des écrans migrés. Clé = identifiant de panneau (voir config/panels.js).
// Les panneaux absents de ce registre retombent sur le PlaceholderPanel : c'est
// ainsi que la migration progresse écran par écran, sans jamais casser la coquille.
import AideScreen from './AideScreen.jsx';
import SyntheseScreen from './SyntheseScreen.jsx';
import PrevisionnelScreen from './PrevisionnelScreen.jsx';
import ObjectifScreen from './ObjectifScreen.jsx';
import EquipeScreen from './EquipeScreen.jsx';
import PresenceScreen from './PresenceScreen.jsx';
import CgDashScreen from './CgDashScreen.jsx';
import ComparativeScreen from './ComparativeScreen.jsx';
import ConsolidationScreen from './ConsolidationScreen.jsx';
import ValidationScreen from './ValidationScreen.jsx';
import RefAgencesScreen from './RefAgencesScreen.jsx';
import ChargesCgScreen from './ChargesCgScreen.jsx';
import ControleScreen from './ControleScreen.jsx';
import GraphiquesScreen from './GraphiquesScreen.jsx';
import PeriodesScreen from './PeriodesScreen.jsx';
import AdminScreen from './AdminScreen.jsx';
import RefsScreen from './RefsScreen.jsx';
import CalScreen from './CalScreen.jsx';
import AffectationScreen from './AffectationScreen.jsx';

export const SCREENS = {
  aide: AideScreen,
  finance: SyntheseScreen,
  previsionnel: PrevisionnelScreen,
  objectif: ObjectifScreen,
  team: EquipeScreen,
  rh: PresenceScreen,
  cgdash: CgDashScreen,
  comparative: ComparativeScreen,
  consolidation: ConsolidationScreen,
  validation: ValidationScreen,
  refagences: RefAgencesScreen,
  rex: PrevisionnelScreen,
  cg: ChargesCgScreen,
  affectation: AffectationScreen,
  controle: ControleScreen,
  graphiques: GraphiquesScreen,
  periodes: PeriodesScreen,
  admin: AdminScreen,
  refs: RefsScreen,
  cal: CalScreen
};

export function screenFor(panelId) {
  return SCREENS[panelId] || null;
}
