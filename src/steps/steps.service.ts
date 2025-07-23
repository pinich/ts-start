import { Injectable } from '@pinich/nject-ts';


@Injectable()
export class StepsService {
    private _value:number;
    constructor(
    ) { 
        this._value = 0;
    }

    public get value():number {
        return ++this._value;
    }
    
}
