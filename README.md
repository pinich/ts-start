# TS-Start

A TypeScript Node.js starter project with dependency injection, modular architecture, and comprehensive VS Code debugging support.

## 🚀 Features

- **TypeScript** - Full TypeScript support with strict type checking
- **Dependency Injection** - Automatic DI using `nject-ts` package
- **Modular Architecture** - Clean separation of concerns with modules
- **VS Code Integration** - Complete debugging and development setup
- **Source Maps** - Full debugging support in TypeScript source files
- **Build Pipeline** - Optimized development and production workflows

## 📦 Project Structure

```
ts-start/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── app.Module.ts           # Root application module
│   ├── services/
│   │   └── application.service.ts  # Main application service
│   └── steps/
│       ├── steps.Module.ts     # Steps module
│       └── steps.service.ts    # Steps service with counter logic
├── .vscode/
│   ├── launch.json            # Debug configurations
│   ├── tasks.json             # Build and run tasks
│   └── settings.json          # VS Code project settings
├── dist/                      # Compiled JavaScript output
├── tsconfig.json             # TypeScript configuration
├── package.json              # Project dependencies and scripts
└── .gitignore               # Git ignore rules
```

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd ts-start

# Install dependencies
npm install
```

## 📋 Available Scripts

### Development
```bash
# Run in development mode (with ts-node)
npm run dev

# Build the project
npm run build

# Run production build
npm start
```

### VS Code Debugging
- **F5** - Start debugging with TypeScript sources
- **Ctrl+Shift+P** → "Debug: Select and Start Debugging" for more options

## 🏗️ Architecture

### Dependency Injection

The project uses automatic dependency injection without explicit decorators:

```typescript
@Injectable()
export class ApplicationService {
    constructor(
        private stepsSvc: StepsService  // Automatically injected
    ) { }
}
```

### Module System

Services are organized into modules for better separation:

```typescript
@Module({
    providers: [StepsService],
    exports: [StepsService]
})
export class StepsModule { }
```

## 🔧 VS Code Integration

### Debug Configurations

1. **Debug TypeScript** - Debug directly from `.ts` files
2. **Debug Compiled JS** - Debug the compiled production build
3. **Attach to Process** - Attach to running Node.js process

### Tasks

- **Build** (`Ctrl+Shift+P` → "Tasks: Run Task" → "build")
- **Dev** - Run development server
- **Start** - Run production build

### Features

- IntelliSense and auto-completion
- Automatic import organization
- Source map debugging
- TypeScript error highlighting

## 🚦 Getting Started

1. **Start Development:**
   ```bash
   npm run dev
   ```

2. **Set Breakpoints:**
   - Open any `.ts` file in VS Code
   - Click on line numbers to set breakpoints

3. **Debug:**
   - Press `F5` to start debugging
   - Choose "Debug TypeScript" configuration

4. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

## 📝 Adding New Features

### Creating a New Service

1. Create the service file:
   ```typescript
   // src/my-feature/my-feature.service.ts
   import { Injectable } from 'nject-ts';

   @Injectable()
   export class MyFeatureService {
       doSomething(): string {
           return 'Hello from MyFeature!';
       }
   }
   ```

2. Create the module:
   ```typescript
   // src/my-feature/my-feature.module.ts
   import { Module } from 'nject-ts';
   import { MyFeatureService } from './my-feature.service';

   @Module({
       providers: [MyFeatureService],
       exports: [MyFeatureService]
   })
   export class MyFeatureModule { }
   ```

3. Import in the root module:
   ```typescript
   // src/app.Module.ts
   @Module({
       imports: [StepsModule, MyFeatureModule],
       providers: [ApplicationService]
   })
   export class AppModule { }
   ```

### Using the Service

```typescript
@Injectable()
export class ApplicationService {
    constructor(
        private stepsSvc: StepsService,
        private myFeatureSvc: MyFeatureService  // Auto-injected
    ) { }

    async run(): Promise<void> {
        console.log(this.myFeatureSvc.doSomething());
    }
}
```

## 🔍 Troubleshooting

### Dependency Injection Not Working

- Ensure modules are properly imported in `AppModule`
- Verify services are exported from their modules
- Check that `reflect-metadata` is imported in `index.ts`

### Debugging Issues

- Confirm source maps are enabled in `tsconfig.json`
- Rebuild the project: `npm run build`
- Check VS Code debug console for errors

### TypeScript Errors

- Run `npm run build` to see compilation errors
- Check `tsconfig.json` configuration
- Ensure all dependencies are properly installed

## 📚 Dependencies

### Runtime
- `nject-ts` - Dependency injection framework
- `reflect-metadata` - Metadata reflection for decorators

### Development
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution engine
- `@types/node` - Node.js type definitions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details.