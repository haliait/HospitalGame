import { Component, inject } from '@angular/core';
import { GameService } from './game-service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  gameService = inject(GameService);
  world = this.gameService.world;
}