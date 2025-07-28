// Load environment variables first, before any other imports
import * as dotenv from 'dotenv';
dotenv.config();

import { bootstrap } from "nject-ts"
import { AppModule } from "./src/app.module"
import { AppService } from "./src/app.service";

export const main = async () => {
  try {
    const container = await bootstrap(AppModule);
    const app = container.resolve(AppService);
    await app.start();
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      try {
        await app.shutdown();
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
  } catch (error) {
    console.error("Error during application startup:", error);
    process.exit(1);
  }
};



main().catch((error) => {
  console.error("Error in main function:", error);
  process.exit(1);
});