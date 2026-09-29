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
        const httpLink = httpLinkFactory.create({ uri: 'http://localhost:3000/graphql' });
        return {
          cache: new InMemoryCache(),
          link: httpLink,
        };
      }),
      withHttpLink(),
    ),
  ]);
}
