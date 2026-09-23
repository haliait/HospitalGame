import { origworld } from './origworld.js';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service.js';
import { Palier } from './graphql.js';

@Resolver('World')
export class GraphQlResolver {
    constructor(private service: AppService) {}

    @Query()
    async getWorld(@Args('user') user: string) {
        const world = this.service.readUserWorld(user);
        this.service.saveWorld(user, world);
        return world;
    }

    @Mutation()
    async acheterQtProduit(
        @Args('user') user: string,
        @Args('id') id: number,
        @Args('quantite') quantite: number,
    ) {
        const world = this.service.readUserWorld(user);

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
        product.cout = coutCourant; // nouveau prix pour le prochain achat

        // Mise à jour de l'argent du monde
        world.money -= coutTotal;

        this.service.saveWorld(user, world);
        return product;
    }

    @Mutation()
    async lancerProductionProduit(
        @Args('user') user: string,
        @Args('id') id: number,
    ) {
        const world = this.service.readUserWorld(user);

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
        const world = this.service.readUserWorld(user);

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

        this.service.saveWorld(user, world);
        return manager;
    }
    
}

