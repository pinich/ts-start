import { Injectable } from 'nject-ts';
import { StepsService } from '../steps/steps.service';


@Injectable()
export class ApplicationService {
    constructor(
        private stepsSvc: StepsService
    ) { }

    async run(): Promise<void> {
        console.log('Starting to run');
        for(let i =0;i<10;i++){
            const result = this.stepsSvc.value;
            console.log(`😈 ${result}`);
        }
    }

    async shutdown(): Promise<void> {
        console.log('Shutting down');
    }
}
