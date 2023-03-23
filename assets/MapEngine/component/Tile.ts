import { _decorator, Component, Node, Sprite, SpriteFrame, math, Enum } from 'cc';
import { TileConfig } from '../data/TileConfig';
const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

export enum TileShapeEnum {
    /**正方形 */
    Square = 0,
    /**菱形 */
    Diamond,
    /**6边形 */
    Hexagon
}

@ccclass('FourSidesLink')
export class FourSidesLink {
    @property({ displayName: '上' })
    top: boolean = false;
    @property({ displayName: '左' })
    left: boolean = false;
    @property({ displayName: '下' })
    bottom: boolean = false;
    @property({ displayName: '右' })
    right: boolean = false;
}

@ccclass('SixSidesLink')
export class SixSidesLink {
    @property({ displayName: '上' })
    top: boolean = false;
    @property({ displayName: '左上' })
    leftTop: boolean = false;
    @property({ displayName: '左下' })
    leftBottom: boolean = false;
    @property({ displayName: '下' })
    bottom: boolean = false;
    @property({ displayName: '右下' })
    rightBottom: boolean = false;
    @property({ displayName: '右上' })
    rightTop: boolean = false;
}

@ccclass('Tile')
@requireComponent(Sprite)
@executeInEditMode()
export class Tile extends Component {
    @property({ displayName: '名称', readonly: true })
    tileName: string = '';
    @property({ displayName: '图片尺寸', readonly: true })
    origiSize: math.Size = math.size();
    @property({ displayName: '地砖尺寸', readonly: true })
    size: math.Size = math.size();
    @property({ displayName: '地砖形状', type: Enum(TileShapeEnum) })
    shape: TileShapeEnum = TileShapeEnum.Square;
    @property({ displayName: '地砖厚度', min: 0 })
    thickness: number = 0;
    @property({ displayName: '连接地砖方向', type: FourSidesLink, visible() { return this.shape != TileShapeEnum.Hexagon; } })
    links4: FourSidesLink = new FourSidesLink();
    @property({ displayName: '连接地砖方向', type: SixSidesLink, visible() { return this.shape == TileShapeEnum.Hexagon; } })
    links6: SixSidesLink = new SixSidesLink();
    @property({ displayName: '执行修改' })
    doChange: boolean = false;

    private _config: TileConfig = new TileConfig();

    update() {
        if (!this.doChange) return;
        this.doChange = false;
        this.changeThickness();
        this.changeLinks();
    }

    public setTile(sf: SpriteFrame, info?: any) {
        this.getComponent(Sprite).spriteFrame = sf;
        this._config.initWithSpriteFrame(sf);
        if (info) {
            this._config.dirs = info.dirs;
            this._config.shape = info.shape;
            this._config.thickness = info.thickness;
        }
        this.thickness = this._config.thickness;
        this.shape = this._config.shape;
        this.initDirs(this._config.dirs);
        this.tileName = this._config.name;
        this.origiSize = math.size(this._config.originalSize.width, this._config.originalSize.height);
        const size = this._config.size;
        this.size = math.size(size.width, size.height);
    }

    public get spriteFrame(): SpriteFrame {
        return this.getComponent(Sprite).spriteFrame;
    }


    public get config(): any {
        return this._config.data;
    }

    private initDirs(dirs: string) {
        if (!dirs) return;
        switch (this.shape) {
            case TileShapeEnum.Hexagon:
                this.links6.top = dirs.indexOf('0') != -1;
                this.links6.leftTop = dirs.indexOf('1') != -1;
                this.links6.leftBottom = dirs.indexOf('2') != -1;
                this.links6.bottom = dirs.indexOf('3') != -1;
                this.links6.rightBottom = dirs.indexOf('4') != -1;
                this.links6.rightTop = dirs.indexOf('5') != -1;
                break;
            default:
                this.links4.top = dirs.indexOf('0') != -1;
                this.links4.left = dirs.indexOf('1') != -1;
                this.links4.bottom = dirs.indexOf('2') != -1;
                this.links4.right = dirs.indexOf('3') != -1;
                break;
        }
    }

    public dirs(): string {
        return this._config.dirs;
    }

    private changeThickness() {
        this._config.thickness = this.thickness;
        console.log(this._config.originalSize);
        const size = this._config.size;
        console.log(size);
        this.size = math.size(size.width, size.height);
    }

    private changeLinks() {
        let a: string = '';
        switch (this.shape) {
            case TileShapeEnum.Hexagon:
                this.links6.top && (a += '0');
                this.links6.leftTop && (a += '1');
                this.links6.leftBottom && (a += '2');
                this.links6.bottom && (a += '3');
                this.links6.rightBottom && (a += '4');
                this.links6.rightTop && (a += '5');
                break;
            default:
                this.links4.top && (a += '0');
                this.links4.left && (a += '1');
                this.links4.bottom && (a += '2');
                this.links4.right && (a += '3');
                break;
        }
        this._config.dirs = a;
        this._config.shape = this.shape;
    }
}


