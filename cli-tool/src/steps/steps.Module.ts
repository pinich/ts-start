import { Module } from 'nject-ts';
import { StepsService } from './steps.service';


@Module({
    providers: [
        StepsService,
    ],
    exports: [StepsService]
})
export class StepsModule { }
