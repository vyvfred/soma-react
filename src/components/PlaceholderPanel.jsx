// Panneau d'attente pour un écran pas encore migré.
// Volontairement honnête : il n'imite AUCUNE fonctionnalité, il annonce clairement
// que l'écran sera porté dans un sprint ultérieur. (Règle SOMA : aucun bouton sans effet.)

export default function PlaceholderPanel({ id, label }) {
  return (
    <div className="soma-placeholder">
      <div className="soma-placeholder-card">
        <div className="soma-placeholder-tag">Écran non encore migré</div>
        <h2>{label}</h2>
        <p>
          Cet écran fait partie de la migration React en cours. Le socle technique
          (connexion, navigation, sécurité) est en place ; le contenu de cet écran
          sera porté à l'identique depuis l'application actuelle dans un sprint suivant.
        </p>
        <div className="soma-placeholder-meta">
          Identifiant interne : <code>{id}</code>
        </div>
      </div>
    </div>
  );
}
