export interface IInput {
    mouseX: number;
    mouseY: number;
    mouseWorldX: number;
    mouseWorldY: number;
    mouseLeft: boolean;
    mouseRight: boolean;
    mouseLeftJustPressed: boolean;
    mouseRightJustPressed: boolean;

    isKeyDown(code: string): boolean;
    isKeyJustPressed(code: string): boolean;
    isKeyJustReleased(code: string): boolean;
}
