import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { InMemoryCache, provideApollo, withApolloOptions } from '@apollo-orbit/angular';
import { HttpLinkFactory, withHttpLink } from '@apollo-orbit/angular/http';

export function provideGraphQL(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideApollo(
      withApolloOptions(() => {
        const httpLinkFactory = inject(HttpLinkFactory);
        // ⚠️ Port 3000 (notre backend NestJS), et non 4000 comme dans l'apéritif
        // Backend de test du prof : https://isiscapitalist.chl.connected-health.fr/graphql
        // Adresse relue à chaque requête : le joueur peut la changer (GameService.changeServer)
        const httpLink = httpLinkFactory.create({
          uri: () => (localStorage.getItem('server') ?? 'http://localhost:3000/') + 'graphql',
        });
        return {
          cache: new InMemoryCache({
            // Les produits ont les mêmes id (1 à 6) pour tous les joueurs : sans cela, Apollo
            // les fusionne dans son cache et la partie d'un pseudo écrase celle d'un autre
            typePolicies: { Product: { keyFields: false } },
          }),
          link: httpLink,
        };
      }),
      withHttpLink(),
    ),
  ]);
}
