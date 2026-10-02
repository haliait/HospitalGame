import { Component, inject } from '@angular/core';
import { GameService } from './game-service';
import { Produit } from './produit/produit';

@Component({
  selector: 'app-root',
  imports: [Produit],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  gameService = inject(GameService);
  world = this.gameService.world;
}