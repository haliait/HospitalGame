import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatBadge } from '@angular/material/badge';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormField } from '@angular/forms/signals';
import { GameService } from './game-service';
import { MusicService } from './music-service';
import { Produit } from './produit/produit';
import { BigvaluePipe } from './bigvalue-pipe';
import { Palier, Product } from './graphql';

@Component({
  selector: 'app-root',
  imports: [Produit, BigvaluePipe, MatBadge, FormField],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  gameService = inject(GameService);
  music = inject(MusicService);
  private snackBar = inject(MatSnackBar);
  world = this.gameService.world;

  // ---- Commutateur d'achat ----
  qtmulti = signal('x1');
  private multis = ['x1', 'x10', 'x100', 'Max'];

  changeQtMulti() {
    const i = this.multis.indexOf(this.qtmulti());
    this.qtmulti.set(this.multis[(i + 1) % this.multis.length]);
  }

  // ---- Affichage des modales ----
  showManagers = signal(false);
  showUnlocks = signal(false);
  showUpgrades = signal(false);
  showAngelUpgrades = signal(false);
  showInvestors = signal(false);

  // ---- Logo : le nom du monde coupé en deux (ex. « St. Hope » / « Hospital ») ----
  private motsDuNom = computed(() => (this.world()?.name ?? '').trim().split(/\s+/));
  logoHaut = computed(() => this.motsDuNom().slice(0, -1).join(' '));
  logoBas = computed(() => this.motsDuNom().at(-1) ?? '');

  // ---- Badges ----
  badgeManagers = computed(() => {
    const w = this.world();
    return w ? w.managers.filter((m) => !m.unlocked && w.money >= m.seuil).length : 0;
  });
  badgeUpgrades = computed(() => {
    const w = this.world();
    return w ? w.upgrades.filter((u) => !u.unlocked && w.money >= u.seuil).length : 0;
  });
  badgeAngelUpgrades = computed(() => {
    const w = this.world();
    return w ? w.angelupgrades.filter((u) => !u.unlocked && w.activeangels >= u.seuil).length : 0;
  });

  constructor() {
    // toast à chaque nouveau message (on ignore le message vide du démarrage)
    effect(() => {
      const msg = this.gameService.snackmessage();
      if (msg) this.snackBar.open(msg, 'OK', { duration: 2000 });
    });
  }

  // ---- Helpers d'affichage ----
  nextPalier(p: Product): Palier | undefined {
    return p.paliers.find((x) => !x.unlocked);
  }

  // Managers déjà engagés, affichés dans « Mon équipe »
  hiredManagers = computed(() => this.world()?.managers.filter((m) => m.unlocked) ?? []);

  cibleName(p: Palier): string {
    if (p.idcible === 0) return 'All services';
    if (p.idcible === -1) return 'Angels';
    return this.world()?.products.find((x) => x.id === p.idcible)?.name ?? '';
  }
}