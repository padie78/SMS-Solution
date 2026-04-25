// src/amplify-config.ts (puedes crearlo o ponerlo en main.ts)
export const amplifyConfig = {
  API: {
    GraphQL: {
      endpoint: 'https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql',
      region: 'eu-central-1',
      defaultAuthMode: 'userPool' as const
    }
  },
  Auth: {
    Cognito: {
      userPoolId: 'eu-central-1_LJE1bkULW',
      userPoolClientId: '5uomoc3mlgo6h1cgk76j4pemja'
    }
  }
};