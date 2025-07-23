import { Module } from '@pinich/nject-ts';
import { ApplicationService } from './services/application.service';
import { StepsModule } from './steps/steps.Module';

@Module({
    providers: [
        ApplicationService,
    ],
    imports:[
        StepsModule
    ]
})
export class AppModule { }
