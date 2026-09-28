import { origworld } from './origworld.js';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service.js';
import { Palier } from './graphql.js';

@Resolver('World')
export class GraphQlResolver {
    constructor(private service: AppService) {}

    @Query()
    async getWorld(@Args('user') user: string) {
        let world = this.service.readUserWorld(user);
        world = this.service.updateWorld(world);
        this.service.saveWorld(user, world);
        return world;
    }

    @Mutation()
    async acheterQtProduit(
        @Args('user') user: string,
        @Args('id') id: number,
        @Args('quantite') quantite: number,
    ) {
        let world = this.service.readUserWorld(user);
        world = this.service.updateWorld(world);

        const product = world.products.find((p) => p.id === id);
        if (!product) {
            throw new Error(`Le produit avec l'id ${id} n'existe pas`);
        }

        // Calcul du coût total pour acheter "quantite" exemplaires
        let coutTotal = 0;
        let coutCourant = product.cout;
        for (let i = 0; i < quantite; i++) {
            coutTotal += coutCourant;
            coutCourant *= product.croissance;
        }

        // Mise à jour du produit
        product.quantite += quantite;
        if (world.money < coutTotal) {
            throw new Error('Argent insuffisant');
        }
        product.cout = coutCourant; // nouveau prix pour le prochain achat

        // Mise à jour de l'argent du monde
        world.money -= coutTotal;

        this.service.checkUnlocks(world);

        this.service.saveWorld(user, world);
        return product;
    }

    @Mutation()
    async lancerProductionProduit(
        @Args('user') user: string,
        @Args('id') id: number,
    ) {
        let world = this.service.readUserWorld(user);
        world = this.service.updateWorld(world);

        const product = world.products.find((p) => p.id === id);
        if (!product) {
          throw new Error(`Le produit avec l'id ${id} n'existe pas`);
        }

        product.timeleft = product.vitesse;

        this.service.saveWorld(user, world);
        return product;
    }

    @Mutation()
    async engagerManager(
        @Args('user') user: string,
        @Args('name') name: string,
    ) {
        let world = this.service.readUserWorld(user);
        world = this.service.updateWorld(world);

        const manager = world.managers.find((m) => m.name === name);
        if (!manager) {
            throw new Error(`Le manager ${name} n'existe pas`);
        }

        const product = world.products.find((p) => p.id === manager.idcible);
        if (!product) {
            throw new Error(`Le produit géré par ${name} n'existe pas`);
        }

        manager.unlocked = true;
        product.managerUnlocked = true;

        if (world.money < manager.seuil) {
          throw new Error(`Argent insuffisant pour engager ${name}`);
        }
        world.money -= manager.seuil;

        this.service.saveWorld(user, world);
        return manager;
    }

    @Mutation()
    async acheterCashUpgrade(
       @Args('user') user: string,
       @Args('name') name: string,
    ) {
        let world = this.service.readUserWorld(user);
        world = this.service.updateWorld(world);

        const palier = world.upgrades.find((u) => u.name === name);
        if (!palier) {
            throw new Error(`L'upgrade ${name} n'existe pas`);
        }
        if (palier.unlocked) {
            throw new Error(`L'upgrade ${name} a déjà été acheté`);
        }
        if (world.money < palier.seuil) {
            throw new Error(`Argent insuffisant pour acheter ${name}`);
        }

        world.money -= palier.seuil;
        this.service.applyPalierBonus(world, palier);

        this.service.saveWorld(user, world);
        return palier;
    }

    @Mutation()
    async acheterAngelUpgrade(
        @Args('user') user: string,
        @Args('name') name: string,
    ) {
        let world = this.service.readUserWorld(user);
        world = this.service.updateWorld(world);

        const palier = world.angelupgrades.find((u) => u.name === name);
        if (!palier) {
            throw new Error(`L'angel upgrade ${name} n'existe pas`);
        }
        if (palier.unlocked) {
            throw new Error(`L'angel upgrade ${name} a déjà été acheté`);
        }
        if (world.activeangels < palier.seuil) {
            throw new Error(`Anges insuffisants pour acheter ${name}`);
        }

        world.activeangels -= palier.seuil;
        this.service.applyPalierBonus(world, palier);

        this.service.saveWorld(user, world);
        return palier;
    }


    @Mutation()
    async resetWorld(@Args('user') user: string) {
        let world = this.service.readUserWorld(user);
        world = this.service.updateWorld(world);

        const angesGagnes = Math.floor(150 * Math.sqrt(world.score / 1e15) - world.totalangels);

        const nouveauMonde = JSON.parse(JSON.stringify(origworld));
        nouveauMonde.score = world.score;
        nouveauMonde.totalangels = world.totalangels + Math.max(0, angesGagnes);
        nouveauMonde.activeangels = world.activeangels + Math.max(0, angesGagnes);

        this.service.saveWorld(user, nouveauMonde);
        return nouveauMonde;
    }
    
}

