# Dream Lodge — Frontend

Aplicación móvil y web de **Dream Lodge**: descubre obras culturales (cine, música, literatura, arte visual y videojuegos) con recomendaciones personalizadas según tu perfil de personalidad.

Construida con **Expo** y **React Native**, funciona en **Android**.

## Características

- **Autenticación** — registro, inicio de sesión, recuperación de contraseña y Google Sign-In
- **Test de personalidad Big Five (OCEAN)** — test rápido o profundo para generar tu perfil
- **Feed cultural personalizado** — recomendaciones por categoría basadas en tus resultados
- **Búsqueda y filtros** — explora por tipo de contenido cultural
- **Detalle de obras** — información ampliada, favoritos y consumo de contenido
- **Chat con IA** — conversaciones para explorar recomendaciones y reflexionar sobre arte
- **Perfil de usuario** — resultados del test, ajustes y gestión de cuenta

## Stack tecnológico

| Área | Tecnología |
|------|------------|
| Framework | [Expo SDK 54](https://docs.expo.dev/) + [React Native](https://reactnative.dev/) |
| Navegación | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing) |
| Estilos | [NativeWind](https://www.nativewind.dev/) + [Tailwind CSS](https://tailwindcss.com/) |
| Estado / datos | React Context, AsyncStorage, caché local |
| HTTP | [Axios](https://axios-http.com/) |
| Formularios | [React Hook Form](https://react-hook-form.com/) |
| Iconos | [Lucide React Native](https://lucide.dev/) |
| Builds nativos | [EAS Build](https://docs.expo.dev/build/introduction/) |

## Estructura del proyecto

```
dreamlodge-frontend/
├── app/                    # Rutas (Expo Router)
│   ├── index.tsx           # Pantalla de arranque / redirección
│   ├── login.tsx           # Autenticación
│   ├── FeedScreen.tsx      # Feed principal
│   ├── big-5-test.tsx      # Test de personalidad
│   ├── ai_chat.tsx         # Chat con IA
│   └── ...
├── src/
│   ├── api/                # Cliente HTTP y endpoints
│   ├── components/         # UI reutilizable
│   ├── contexts/           # AuthContext y estado global
│   ├── hooks/              # Lógica de pantallas
│   ├── services/           # Servicios (chat, etc.)
│   ├── theme/              # Tokens de diseño
│   ├── types/              # Tipos TypeScript
│   └── utils/              # Caché, scoring OCEAN, storage
├── assets/images/          # Iconos y recursos estáticos
├── app.json                # Configuración Expo
└── eas.json                # Perfiles de build EAS
```

## Flujo de la aplicación

1. El usuario inicia sesión o se registra.
2. Si no tiene resultados del test, se le guía al **test Big Five**.
3. Con perfil completado, accede al **feed** con recomendaciones culturales.
4. Puede explorar obras, guardar favoritos, chatear con IA y revisar su perfil.

## Licencia

Proyecto privado. Consulta con el equipo de Dream Lodge antes de redistribuir o usar el código.

