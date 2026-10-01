import { Component, inject, input, signal } from '@angular/core';
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
export class Produit {
  gameService = inject(GameService);

  // Données reçues du parent (App) — noms fixés avec la Personne B
  prod = input<Product | undefined>();
  qtmulti = input<string>('x1'); // valeurs : 'x1' | 'x10' | 'x100' | 'Max'

  // État de la production (rempli à l'étape 3)
  progress = signal(0);   // 0 à 100 (%)
  timeleft = signal(0);   // temps restant en ms

  /** Clic sur l'image : lance la production (étape 3) */
  startFabrication() {}

  /** Clic sur le bouton d'achat (étape 4) */
  acheter() {}
}