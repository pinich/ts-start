import { bootstrap } from "nject-ts";
import { AppModule } from "./app.Module";
import { ApplicationService } from "./services/application.service";

export async function main() {
    try {
        const container = await bootstrap(AppModule);
        const app = container.resolve(ApplicationService);
        await app.run();
        await app.shutdown();
    } catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}

main();