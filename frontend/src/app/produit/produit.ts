import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GameService } from '../game-service';
import { Product } from '../graphql';
import { SecondsPipe } from '../seconds-pipe';

@Component({
  selector: 'app-produit',
  imports: [DecimalPipe, SecondsPipe],
  templateUrl: './produit.html',
  styleUrl: './produit.css',
})
export class Produit implements OnInit, OnDestroy {
  gameService = inject(GameService);

  // Données reçues du parent (App) — noms fixés avec la Personne B
  prod = input<Product | undefined>();
  qtmulti = input<string>('x1'); // valeurs : 'x1' | 'x10' | 'x100' | 'Max'

  // Temps restant avant la fin de la production en cours (ms)
  timeleft = signal(0);

  // Avancement de la barre (0 à 100 %), recalculé automatiquement depuis timeleft
  progress = computed(() => {
    const p = this.prod();
    const t = this.timeleft();
    if (!p || t <= 0) return 0;
    return Math.min(100, Math.max(0, ((p.vitesse - t) / p.vitesse) * 100));
  });

  private lastupdate = performance.now();
  private initialise = false;
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    // Boucle principale : calcScore tous les dixièmes de seconde
    this.timer = setInterval(() => this.calcScore(), 100);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  /** Clic sur l'image : lance la production (si possible) */
  startFabrication() {
    const p = this.prod();
    // Rien à faire si : pas de produit, quantité 0, manager actif, ou production déjà en cours
    if (!p || p.quantite === 0 || p.managerUnlocked || this.timeleft() > 0) return;

    this.timeleft.set(p.vitesse);
    this.lastupdate = performance.now();
    this.gameService.lancerProductionGraphQL(p.id); // prévenir le backend
  }

  /** Fait avancer le temps et déclenche les gains — même logique que updateWorld du backend */
  calcScore() {
    const now = performance.now();
    const elapsed = now - this.lastupdate;
    this.lastupdate = now;

    const p = this.prod();
    if (!p) return;

    // Premier passage : on reprend le temps restant connu du serveur
    if (!this.initialise) {
      this.timeleft.set(p.timeleft);
      this.initialise = true;
      return;
    }

    let t = this.timeleft();

    if (!p.managerUnlocked) {
      // CAS 1 : pas de manager, une seule production par clic
      if (t > 0) {
        if (t <= elapsed) {
          this.timeleft.set(0);
          this.gameService.productionDone(p, 1);
        } else {
          this.timeleft.set(t - elapsed);
        }
      }
    } else {
      // CAS 2 : manager débloqué, production automatique en boucle
      let reste = elapsed;
      let nb = 0;
      if (t > 0) {
        if (t <= reste) {
          nb += 1;
          reste -= t;
        } else {
          t -= reste;
          reste = 0;
        }
      }
      if (reste > 0) {
        nb += Math.floor(reste / p.vitesse);
        t = p.vitesse - (reste % p.vitesse);
      }
      this.timeleft.set(t);
      if (nb > 0) this.gameService.productionDone(p, nb);
    }
  }

  // ---------- ACHAT ----------

  /** Quantité maximale achetable avec l'argent actuel */
  maxCanBuy = computed(() => {
    const p = this.prod();
    const money = this.gameService.world()?.money ?? 0;
    if (!p || money < p.cout) return 0;
    // Estimation par la formule de la somme géométrique
    let n = Math.floor(
      Math.log(1 + (money * (p.croissance - 1)) / p.cout) / Math.log(p.croissance),
    );
    // Correction des arrondis : on vérifie avec le vrai calcul
    while (n > 0 && this.gameService.coutAchat(p, n) > money) n--;
    return n;
  });

  /** Nombre d'exemplaires à acheter selon le commutateur x1 / x10 / x100 / Max */
  numberToBuy = computed(() => {
    switch (this.qtmulti()) {
      case 'x10': return 10;
      case 'x100': return 100;
      case 'Max': return this.maxCanBuy();
      default: return 1;
    }
  });

  /** Coût total de l'achat affiché sur le bouton */
  coutTotal = computed(() => {
    const p = this.prod();
    return p ? this.gameService.coutAchat(p, this.numberToBuy()) : 0;
  });

  /** Vrai si le joueur peut payer la quantité demandée */
  canBuy = computed(() => {
    const money = this.gameService.world()?.money ?? 0;
    return this.numberToBuy() > 0 && this.coutTotal() <= money;
  });

  /** Clic sur le bouton d'achat */
  acheter() {
    const p = this.prod();
    if (!p || !this.canBuy()) return;
    this.gameService.buyProduct(this.numberToBuy(), p);
  }
}