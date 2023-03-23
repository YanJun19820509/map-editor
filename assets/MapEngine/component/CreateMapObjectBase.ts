import { CCInteger, CCString } from 'cc';
import { math } from 'cc';
import { _decorator, Component, Node } from 'cc';
import { Tile, TileShapeEnum } from './Tile';
import { Range } from '../../NoUi3/types'
import { no } from '../../NoUi3/no';
import { UITransform } from 'cc';
const { ccclass, property } = _decorator;
//地砖设置
@ccclass('TileInfo')
export class TileInfo {
    @property({ type: CCString, displayName: '地砖名称' })
    tileName: string = '';
    @property({ type: CCInteger, displayName: '权重' })
    weight: number = 1;
    @property({ type: Node, displayName: '需要的地砖' })
    tileNode: Node = null;

    public tileConfig: any;

    public constructor(name: string, weight: number, tile?: Node | any) {
        this.tileName = name;
        this.weight = weight;
        if (tile) {
            if (tile instanceof Node)
                this.tileNode = tile;
            else this.tileConfig = tile;
        }
    }

    public get config(): any {
        return {
            tileName: this.tileName,
            weight: this.weight
        };
    }

    public check() {
        this.tileName = this.tileNode.getComponent(Tile).tileName;
    }
}

/** 地砖坐标*/
export type TilePos = { u: number, v: number, x: number, y: number };
export function TilePosEqual(pos1: TilePos, pos2: TilePos): boolean {
    if (!pos1 || !pos2) return false;
    return pos1.u == pos2.u && pos1.v == pos2.v;
}

@ccclass('CreateMapObjectBase')
export class CreateMapObjectBase extends Component {
    /**地砖形状 */
    shape: TileShapeEnum = TileShapeEnum.Square;
    /**格子尺寸 */
    gridSize: math.Size = math.size(50, 50);
    /**格子数 */
    gridsNum: string = '';
    /**需要的地砖 */
    tileInfos: TileInfo[] = [];
    /**地砖间隔区间, 两块地砖之间最小间隔格子数*/
    density: Range = new Range();
    /**特定区域 */
    spaces: math.Rect[] = [];
    /**特定区域为空地 */
    isEmpty: boolean = true;
    /**地砖格子内居中 */
    isCenter: boolean = true;
    /**地板容器 */
    container: Node = null;

    protected _gridpos: TilePos[] = [];
    protected _usedGrid: string[] = [];

    public setConfig(v: any) {
        this.shape = v.shape;
        this.gridSize.width = v.gridSize[0];
        this.gridSize.height = v.gridSize[1];
        this.density.set(v.density[0], v.density[1]);
        this.isEmpty = v.isEmpty;
        this.isCenter = v.isCenter;
        this.container = no.getNodeInParents(this.node, v.container);
        v.spaces.forEach((s: number[]) => {
            this.spaces.push(math.rect(s[0], s[1], s[2], s[3]));
        });
        this.setGridPositions();
    }

    public setTileInfos(configs: { tileName: string, weight: number }[], tiles: Tile[] | any) {
        configs.forEach(a => {
            if (tiles instanceof Array) {
                for (let i = 0, n = tiles.length; i < n; i++) {
                    if (tiles[i].tileName == a.tileName) {
                        this.tileInfos.push(new TileInfo(a.tileName, a.weight, tiles[i].node));
                        break;
                    }
                }
            } else {
                this.tileInfos.push(new TileInfo(a.tileName, a.weight, tiles[a.tileName]));
            }
        });
    }

    protected setGridPositions() {
        switch (this.shape) {
            case TileShapeEnum.Diamond:
                this._gridpos = this.getDiamondGridPositions();
                break;
            case TileShapeEnum.Hexagon:
                this._gridpos = this.getHexagonGridPositions();
                break;
            case TileShapeEnum.Square:
                this._gridpos = this.getSquareGridPositions();
                break;
        }
    }

    protected getDiamondGridPositions(): TilePos[] {
        let a: TilePos[] = [];
        const gridSize = this.gridSize,
            contentSize = this.container.getComponent(UITransform).contentSize,
            anchor = this.container.getComponent(UITransform).anchorPoint;
        let row = no.ceil(contentSize.height / gridSize.height * 2),
            col = no.ceil(contentSize.width / gridSize.width);
        if (row % 2 == 0) row++;
        if (col % 2 == 0) col++;
        const w = gridSize.width / 2,
            h = gridSize.height / 2;
        for (let i = 0; i < row; i++) {
            const mi = (i % 2) / 2, i2 = i / 2;;
            for (let j = 0; j < col; j++) {
                const x = (mi + j) * gridSize.width - contentSize.width * anchor.x,
                    y = contentSize.height * anchor.y - i2 * gridSize.height;
                a[a.length] = {
                    u: Math.ceil(Math.floor((y / h + x / w) * 5) / 10),
                    v: Math.ceil(Math.floor((y / h - x / w) * 5) / 10),
                    x: x,
                    y: y
                };
            }
        }

        this.gridsNum = `${col}x${row}`;
        return a;
    }

    protected getHexagonGridPositions(): TilePos[] {
        let a: TilePos[] = [];
        return a;
    }

    protected getSquareGridPositions(): TilePos[] {
        let a: TilePos[] = [];
        const gridSize = this.gridSize,
            contentSize = this.container.getComponent(UITransform).contentSize,
            anchor = this.container.getComponent(UITransform).anchorPoint;
        let row = no.ceil(contentSize.height / gridSize.height),
            col = no.ceil(contentSize.width / gridSize.width);
        if (row % 2 > 0) row++;
        if (col % 2 > 0) col++;
        for (let i = 0; i < row; i++) {
            for (let j = 0; j < col; j++) {
                a[a.length] = {
                    u: j,
                    v: i,
                    x: (j + .5) * gridSize.width - contentSize.width * anchor.x,
                    y: (row - i - .5) * gridSize.height - contentSize.height * anchor.y
                };
            }
        }
        this.gridsNum = `${col}x${row}`;
        return a;
    }

    protected checkInSpace(point: math.Vec2): boolean {
        for (let i = 0, n = this.spaces.length; i < n; i++) {
            if (this.spaces[i].contains(point)) {
                return true;
            }
        }
        return false;
    }

    protected useGrid(pos: TilePos) {
        no.addToArray(this._usedGrid, `${pos.u}_${pos.v}`);
    }

    public isUsed(pos: TilePos): boolean {
        return this._usedGrid.indexOf(`${pos.u}_${pos.v}`) > -1;
    }
}


