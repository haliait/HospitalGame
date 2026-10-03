import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { Apollo } from '@apollo-orbit/angular';
// Types (types.ts) et requêtes (operations.ts) générés par "npm run codegen",
// ré-exportés par graphql/index.ts
import {
  Palier,
  Product,
  RatioType, // ⚠️ valeurs en PascalCase côté front : RatioType.Gain, RatioType.Vitesse, RatioType.Ange
  GET_WORLD_QUERY,
  ACHETER_QT_PRODUIT_MUTATION,
  LANCER_PRODUCTION_PRODUIT_MUTATION,
  ENGAGER_MANAGER_MUTATION,
  ACHETER_CASH_UPGRADE_MUTATION,
  ACHETER_ANGEL_UPGRADE_MUTATION,
  RESET_WORLD_MUTATION,
} from './graphql';

interface UserLogin {
  name: string;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private apollo = inject(Apollo);

  // ============================================================
  // === SOCLE COMMUN (Phase 0) - ne pas modifier sans prévenir ===
  // ============================================================

  user = signal('');
  // ⚠️ slash final obligatoire : les logos sont de la forme "icones/xxx.png"
  server = signal('http://localhost:3000/');

  worldQuery = this.apollo.signal.query({
    query: GET_WORLD_QUERY,
    variables: () => ({ user: this.user() }),
  });

  // ⚠️ Les données Apollo sont figées : toujours modifier le monde par copie
  //    ({ ...world, money: ... }), jamais world.money = ... directement
  world = linkedSignal(() => this.worldQuery.data()?.getWorld);

  // Message éphémère affiché par App (snackbar)
  snackmessage = signal('');

  // Formulaire du pseudo
  userLoginModel = signal<UserLogin>({ name: '' });
  loginForm = form(this.userLoginModel);

  constructor() {
    let username = localStorage.getItem('username');
    if (!username) {
      username = 'Captain' + Math.floor(Math.random() * 10000);
      // On mémorise le pseudo généré, sinon un nouveau joueur est créé à chaque rechargement
      localStorage.setItem('username', username);
    }
    this.loginForm.name().value.set(username);
    this.user.set(username);
  }
  commitName() {
    const field = this.loginForm.name().value();
    localStorage.setItem('username', field);
    this.user.set(field);
  }

  refreshWorld() {
    this.worldQuery.refetch();
  }

  // ---------- Mutations GraphQL (appels backend) ----------

  readonly acheterProduitsMutation = this.apollo.signal.mutation(ACHETER_QT_PRODUIT_MUTATION);
  readonly lancerProductionMutation = this.apollo.signal.mutation(LANCER_PRODUCTION_PRODUIT_MUTATION);
  readonly engagerManagerMutation = this.apollo.signal.mutation(ENGAGER_MANAGER_MUTATION);
  readonly acheterCashUpgradeMutation = this.apollo.signal.mutation(ACHETER_CASH_UPGRADE_MUTATION);
  readonly acheterAngelUpgradeMutation = this.apollo.signal.mutation(ACHETER_ANGEL_UPGRADE_MUTATION);
  readonly resetWorldMutation = this.apollo.signal.mutation(RESET_WORLD_MUTATION);

  async acheterProduitsGraphQL(id: number, quantite: number) {
    try {
      await this.acheterProduitsMutation.mutate({ variables: { user: this.user(), id, quantite } });
    } catch {
      this.snackmessage.set("Erreur serveur : achat du produit");
    }
  }

  async lancerProductionGraphQL(id: number) {
    try {
      await this.lancerProductionMutation.mutate({ variables: { user: this.user(), id } });
    } catch {
      this.snackmessage.set('Erreur serveur : lancement de production');
    }
  }

  async engagerManagerGraphQL(name: string) {
    try {
      await this.engagerManagerMutation.mutate({ variables: { user: this.user(), name } });
    } catch {
      this.snackmessage.set("Erreur serveur : engagement du manager");
    }
  }

  async acheterCashUpgradeGraphQL(name: string) {
    try {
      await this.acheterCashUpgradeMutation.mutate({ variables: { user: this.user(), name } });
    } catch {
      this.snackmessage.set("Erreur serveur : achat de l'upgrade");
    }
  }

  async acheterAngelUpgradeGraphQL(name: string) {
    try {
      await this.acheterAngelUpgradeMutation.mutate({ variables: { user: this.user(), name } });
    } catch {
      this.snackmessage.set("Erreur serveur : achat de l'angel upgrade");
    }
  }

  async resetWorldGraphQL() {
    try {
      await this.resetWorldMutation.mutate({ variables: { user: this.user() } });
      this.refreshWorld();
    } catch {
      this.snackmessage.set('Erreur serveur : reset du monde');
    }
  }

  // ============================================================
  // === MOTEUR DU JEU (Personne A) ===
  // ============================================================

  /** Bonus des anges actifs, à appliquer à chaque gain */
  bonusAnges = computed(() => {
    const w = this.world();
    return w ? 1 + (w.activeangels * w.angelbonus) / 100 : 1;
  });

  /** Appelée par Produit à chaque fin de production (qt = nb de productions) */
  productionDone(prod: Product, qt: number) {
    const gain = prod.revenu * prod.quantite * qt * this.bonusAnges();
    // Le monde est en lecture seule : on crée une copie avec money et score mis à jour
    this.world.update((w) =>
      w ? { ...w, money: w.money + gain, score: w.score + gain } : w,
    );
  }

  /** Coût total pour acheter qt exemplaires du produit */
    coutAchat(prod: Product, qt: number): number {
    // Même calcul que le backend : somme des prix successifs
    let total = 0;
    let prix = prod.cout;
    for (let i = 0; i < qt; i++) {
      total += prix;
      prix *= prod.croissance;
    }
    return total;
  }

  /** Achat de qt exemplaires : met à jour le monde puis prévient le backend */
  buyProduct(qt: number, product: Product) {
    const w = this.world();
    if (!w || qt <= 0) return;

    const cost = this.coutAchat(product, qt);
    if (w.money < cost) return; // pas assez d'argent

    // Nouvelle liste de produits : seul le produit acheté change
    const products = w.products.map((p) =>
      p.id !== product.id
        ? p
        : { ...p, quantite: p.quantite + qt, cout: p.cout * Math.pow(p.croissance, qt) },
    );

    // Nouveau monde : produits mis à jour + argent diminué
    this.world.set({ ...w, products, money: w.money - cost });

    this.checkUnlocks(); // débloque les bonus si un seuil est atteint
    this.acheterProduitsGraphQL(product.id, qt); // prévenir le backend
  }

  /**
   * Applique le bonus d'un palier (unlock, allunlock, cash ou angel upgrade).
   * Utilisée aussi par B pour les upgrades : à écrire en priorité.
   */
  applyBonus(palier: Palier) {
    // ⚠️ N'effectue PAS palier.unlocked = true : c'est à l'appelant de le faire
    const w = this.world();
    if (!w) return;

    // Copie modifiable du monde (les données Apollo sont figées)
    const nw = structuredClone(w);

    // Produits concernés : tous si idcible = 0, sinon celui ciblé
    const cibles =
      palier.idcible === 0 ? nw.products : nw.products.filter((p) => p.id === palier.idcible);

    if (palier.typeratio === RatioType.Gain) {
      cibles.forEach((p) => (p.revenu *= palier.ratio));
    } else if (palier.typeratio === RatioType.Vitesse) {
      cibles.forEach((p) => (p.vitesse /= palier.ratio));
    } else if (palier.typeratio === RatioType.Ange) {
      nw.angelbonus += palier.ratio;
    }

    this.world.set(nw);
  }

  /** Texte lisible d'un bonus, ex. "Consultation : vitesse x2" (utile aussi pour les modales de B) */
  libelleBonus(palier: Palier): string {
    if (palier.typeratio === RatioType.Ange) return `Efficacité des anges +${palier.ratio}%`;
    const cible =
      palier.idcible === 0
        ? 'Tous les services'
        : (this.world()?.products.find((p) => p.id === palier.idcible)?.name ?? '?');
    const type = palier.typeratio === RatioType.Gain ? 'gain' : 'vitesse';
    return `${cible} : ${type} x${palier.ratio}`;
  }

  /** Vérifie et débloque les unlocks du produit + les allunlocks */
  /** Vérifie et débloque les unlocks des produits + les allunlocks (même logique que le backend) */
  checkUnlocks() {
    const w = this.world();
    if (!w) return;

    const nw = structuredClone(w);
    const debloques: Palier[] = [];

    // 1. Unlocks propres à chaque produit
    for (const p of nw.products) {
      for (const palier of p.paliers) {
        if (!palier.unlocked && p.quantite >= palier.seuil) {
          palier.unlocked = true;
          debloques.push(palier);
        }
      }
    }

    // 2. Allunlocks : TOUS les produits doivent atteindre le seuil
    for (const palier of nw.allunlocks) {
      if (!palier.unlocked && nw.products.every((p) => p.quantite >= palier.seuil)) {
        palier.unlocked = true;
        debloques.push(palier);
      }
    }

    if (debloques.length === 0) return;

    // On enregistre les paliers débloqués, puis on applique leurs bonus
    this.world.set(nw);
    debloques.forEach((palier) => this.applyBonus(palier));

    // Message éphémère pour le joueur
    this.snackmessage.set('🔓 ' + debloques.map((pal) => this.libelleBonus(pal)).join(' | '));
  }

  // ============================================================
  // === MENUS ET INTERFACE (Personne B) ===
  // ============================================================

  /** Anges supplémentaires gagnés par la partie en cours */
  angesAGagner = computed(() => {
    const w = this.world();
    if (!w) return 0;
    return Math.max(0, Math.floor(150 * Math.sqrt(w.score / 1e15) - w.totalangels));
  });

  hireManager(manager: Palier) {
    // TODO (B) : vérifier money >= seuil, retirer le coût, manager.unlocked = true,
    //            product.managerUnlocked = true, snackmessage, engagerManagerGraphQL
  }

  buyCashUpgrade(upgrade: Palier) {
    // TODO (B) : vérifier money, retirer le coût, applyBonus(upgrade),
    //            snackmessage, acheterCashUpgradeGraphQL
  }

  buyAngelUpgrade(upgrade: Palier) {
    // TODO (B) : vérifier activeangels, les retirer, applyBonus(upgrade),
    //            snackmessage, acheterAngelUpgradeGraphQL
  }

  resetWorld() {
    // TODO (B) : this.resetWorldGraphQL()
  }
}