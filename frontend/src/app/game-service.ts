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
    // TODO (A) : gain = revenu * quantite * qt * bonusAnges, puis mise à jour money et score
  }

  /** Coût total pour acheter qt exemplaires du produit */
  coutAchat(prod: Product, qt: number): number {
    // TODO (A) : somme géométrique cout * (1 - croissance^qt) / (1 - croissance)
    return 0;
  }

  /** Achat de qt exemplaires : met à jour le monde puis prévient le backend */
  buyProduct(qt: number, product: Product) {
    // TODO (A) : quantite += qt, nouveau cout, money -= coutAchat, checkUnlocks,
    //            puis this.acheterProduitsGraphQL(product.id, qt)
  }

  /**
   * Applique le bonus d'un palier (unlock, allunlock, cash ou angel upgrade).
   * Utilisée aussi par B pour les upgrades : à écrire en priorité.
   */
  applyBonus(palier: Palier) {
    // TODO (A) : gain -> revenu *= ratio ; vitesse -> vitesse /= ratio ;
    //            ange -> angelbonus += ratio ; idcible 0 = tous les produits
  }

  /** Vérifie et débloque les unlocks du produit + les allunlocks */
  checkUnlocks(product: Product) {
    // TODO (A)
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