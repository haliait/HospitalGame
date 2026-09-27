import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { World } from './graphql.js';
import { origworld } from './origworld.js';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  readUserWorld(user: string): World {
    try {
      const data = fs.readFileSync(
        path.join(process.cwd(), 'userworlds/', user + '-world.json'),
      );
      return JSON.parse(data.toString());
    } catch (e: unknown) {
      console.log((e as Error).message);
      return origworld;
    }
  }

  saveWorld(user: string, world: World) {
    fs.writeFile(
      path.join(process.cwd(), 'userworlds/', user + '-world.json'),
      JSON.stringify(world),
      (err) => {
        if (err) {
          console.error(err);
          throw new Error(`Erreur d'écriture du monde coté serveur`);
        }
      },
    );
  }

  updateWorld(world: World) {
    const now = Date.now();
    const elapsed = now - world.lastupdate;

    for (const product of world.products) {
      if (!product.managerUnlocked) {
        // CAS 1 : pas de manager
        if (product.timeleft > 0 && product.timeleft <= elapsed) {
          // la production s'est terminée pendant ce laps de temps
          const gain = product.revenu * product.quantite;
          world.money += gain;
          world.score += gain;
          product.timeleft = 0;
        } else if (product.timeleft > 0) {
          // la production continue, on décompte juste le temps
          product.timeleft -= elapsed;
        }
      } else {
        // CAS 2 : manager débloqué (production automatique en boucle)
        let tempsRestantAUtiliser = elapsed;
        let nombreDeProductions = 0;

        if (product.timeleft > 0) {
          if (product.timeleft <= tempsRestantAUtiliser) {
            nombreDeProductions += 1;
            tempsRestantAUtiliser -= product.timeleft;
          } else {
            product.timeleft -= tempsRestantAUtiliser;
            tempsRestantAUtiliser = 0;
          }
        }

        if (tempsRestantAUtiliser > 0) {
          const cyclesComplets = Math.floor(tempsRestantAUtiliser / product.vitesse);
          nombreDeProductions += cyclesComplets;
          product.timeleft = product.vitesse - (tempsRestantAUtiliser % product.vitesse);
        }

        if (nombreDeProductions > 0) {
          const gain = product.revenu * product.quantite * nombreDeProductions;
          world.money += gain;
          world.score += gain;
        }
      }
    }

    world.lastupdate = now;
    return world;
  }
}
