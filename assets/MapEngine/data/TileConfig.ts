import { _decorator, Component, Node, math, SpriteFrame } from 'cc';
import { no } from '../../NoUi3/no';
const { ccclass, property } = _decorator;

//地砖配置信息
@ccclass('TileConfig')
export class TileConfig extends no.Data {
    constructor() {
        super();
        this.data = {
            name: '',//图名
            originalSize: { width: 0, height: 0 },//原始图片尺寸
            thickness: 0,//地砖厚度
            shape: 0,//地砖形状
            dirs: '012345',//需要连接的方向，数组下标逆时针对应地砖的边，如果是四边形数组下标对应0上1左2下3右，如果是6边形数组下标对应0上1左上2左下3下4右下5右上
        };
    }

    public get name(): string {
        return this.get('name');
    }

    public get atlas(): string {
        return this.get('atlas');
    }

    public get originalSize(): { width: number, height: number } {
        return this.get('originalSize');
    }

    public get size(): { width: number, height: number } {
        let size = no.clone(this.originalSize);
        size.height -= this.thickness;
        return size;
    }

    public get thickness(): number {
        return this.get('thickness');
    }

    public set thickness(v: number) {
        this.set('thickness', v);
    }

    public get shape(): number {
        return this.get('shape');
    }

    public set shape(v: number) {
        this.set('shape', v);
    }

    public get dirs(): string {
        return this.get('dirs');
    }

    public set dirs(dirs: string) {
        this.set('dirs', dirs);
    }

    public initWithSpriteFrame(spriteFrame: SpriteFrame) {
        this.set('name', spriteFrame.name);
        this.set('originalSize', { width: spriteFrame.originalSize.width, height: spriteFrame.originalSize.height });
    }
}


