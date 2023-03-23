import { _decorator, Component, Node, Layers, UITransform, Sprite, math } from 'cc';
import { no } from '../../NoUi3/no';
import { CreateLandform } from './CreateLandform';
import { Tile, TileShapeEnum } from './Tile';
import { Range, UV } from '../../NoUi3/types'
import { TileInfo, TilePos, TilePosEqual } from './CreateMapObjectBase';
const { ccclass, property, executeInEditMode } = _decorator;


@ccclass('PathInfo')
export class PathInfo {
    @property({ type: UV, displayName: '起点' })
    start: UV = new UV();
    @property({ type: UV, displayName: '终点' })
    end: UV = new UV();
    @property({ type: Range, displayName: '转角个数范围' })
    turnNumRange: Range = new Range();

    public uuid: string;

    public constructor(start?: number[], end?: number[], turnNumRange?: number[]) {
        start = start || [0, 0];
        end = end || [0, 0];
        turnNumRange = turnNumRange || [0, 0];
        this.start = new UV(start[0], start[1]);
        this.end = new UV(end[0], end[1]);
        this.turnNumRange = new Range(turnNumRange[0], turnNumRange[1]);
        this.uuid = no.uuid();
    }

    public get config(): any {
        return {
            start: [this.start.u, this.start.v],
            end: [this.end.u, this.end.v],
            turnNumRange: [this.turnNumRange.min, this.turnNumRange.max]
        };
    }

    public get turnNum(): number {
        const a = this.turnNumRange.randomValue;
        // console.log(a);
        return a;
    }

}

//创建路径轨迹
@ccclass('CreatePath')
@executeInEditMode()
export class CreatePath extends CreateLandform {
    @property({ override: true, type: Range, displayName: '地砖间隔区间', tooltip: '两块地砖之间最小间隔格子数', visible() { return false; } })
    density: Range = new Range();
    @property({ type: PathInfo, displayName: '路径' })
    pathInfos: PathInfo[] = [];
    @property({ displayName: '障碍地形节点', type: Node })
    obstacleContainer: Node = null;

    protected _dirTiles: { [k: string]: TileInfo };
    protected _validGridPos: TilePos[];
    protected tileDir: { [k: string]: string };

    public get config(): any {
        let a = super.config;
        a.isPath = true;
        let pathes: any[] = [];
        this.pathInfos.forEach(p => {
            pathes[pathes.length] = p.config;
        });
        a.pathes = pathes;
        if (this.obstacleContainer)
            a.obstacleContainer = this.obstacleContainer.name;
        return a;
    }

    public setConfig(v: any) {
        super.setConfig(v);
        v.pathes?.forEach((p: any) => {
            this.pathInfos[this.pathInfos.length] = new PathInfo(p.start, p.end, p.turnNumRange);
        });
        this.node.active = v.isEnable;
        if (v.obstacleContainer)
            this.obstacleContainer = no.getNodeInParents(this.node, v.obstacleContainer);
    }

    protected initDirTiles() {
        this._dirTiles = {};
        this.tileInfos.forEach(tileInfo => {
            const tile = tileInfo.tileNode.getComponent(Tile);
            this._dirTiles[tile.dirs()] = tileInfo;
        });
    }

    protected setValidGridPos() {
        this._validGridPos = [];
        let point = math.v2();
        this._gridpos.forEach(pos => {
            point.set(pos.x, pos.y);
            const isIn = this.checkInSpace(point);
            if (isIn != this.isEmpty) this._validGridPos[this._validGridPos.length] = pos;
        });
    }

    protected async pavePathes() {
        this.tileDir = {};
        for (let i = 0, n = this.pathInfos.length; i < n; i++) {
            const info = this.pathInfos[i];
            await this.createPath(info);
        }
    }

    private async createPath(pathInfo: PathInfo) {
        let turnPos = this.getTurnPoint(pathInfo.turnNum);
        turnPos = [].concat(this.getPos(pathInfo.start), turnPos, this.getPos(pathInfo.end));
        const pos = this.getAllPointsPath(turnPos);
        for (let i = 0, n = pos.length; i < n; i++) {
            const p = pos[i];
            this.createGrid(p, this._dirTiles[this.tileDir[`${p.u}-${p.v}`]]);
            await no.sleep(.05);
        }
    }

    private getTurnPoint(turnNum: number): TilePos[] {
        if (turnNum == 0) return [];
        let a = no.arrayRandom(this._validGridPos, turnNum, false);
        return [].concat(a);
    }

    private getTowPointPath(p1: TilePos, p2: TilePos, p0?: TilePos): TilePos[] {
        let curU = p1.u,
            curV = p1.v,
            uSteps = p2.u - p1.u,
            vSteps = p2.v - p1.v,
            allStep = Math.abs(uSteps) + Math.abs(vSteps),
            uSub = uSteps == 0 ? 0 : (uSteps > 0 ? 1 : -1),
            vSub = vSteps == 0 ? 0 : (vSteps > 0 ? 1 : -1),
            addStepU = uSteps == 0 ? false : (vSteps == 0 ? true : no.randomBetween(0, 1) <= 0.5),
            path: TilePos[] = [p1],
            obstaclePos: TilePos;
        if (allStep == 2) {
            path[path.length] = p2;
            return path;
        }
        const obstacleContainer = this.obstacleContainer?.getComponent(CreateLandform);
        while (allStep-- > 0) {
            let u = addStepU ? curU + uSub : curU,
                v = addStepU ? curV : curV + vSub,
                pos = this.getPos(u, v),
                lastPos = path[path.length - 1];
            if (!pos) {
                addStepU = !addStepU;
                u = addStepU ? curU + uSub : curU;
                v = addStepU ? curV : curV + vSub;
                pos = this.getPos(u, v);
                if (!pos) break;
            }
            if (obstacleContainer?.isUsed(pos)) {
                //遇到障碍
                if (!TilePosEqual(pos, p2) && !TilePosEqual(pos, p0))
                    obstaclePos = pos;
                break;
            }
            this.checkDir(lastPos, path[path.length - 2] || p0, pos);
            path[path.length] = pos;
            curU = u;
            curV = v;
            if (addStepU) uSteps -= uSub;
            else vSteps -= vSub;
            if (uSteps == 0) addStepU = false;
            else if (vSteps == 0) addStepU = true;
        }
        if (obstaclePos) {//遇到障碍，寻找最近的绕过障碍的点，并重新计算路径
            const bypassPoint = this.getBypassObstaclePoint(obstaclePos, addStepU);
            if (!bypassPoint) return path;
            const path1 = this.getAllPointsPath([path.pop(), bypassPoint, p2]);
            return path.concat(path1);
        }
        this.checkDir(p2, path[path.length - 2]);
        return path;
    }

    private getBypassObstaclePoint(obstaclePos: TilePos, isU: boolean): TilePos {
        let uSub = isU ? 0 : 1, vSub = isU ? 1 : 0, try1 = 0, try2 = 0, pos1: TilePos, pos2: TilePos;
        while (true) {
            try1++;
            pos1 = this.getPos(obstaclePos.u + uSub * try1, obstaclePos.v + vSub * try1);
            if (!pos1 || !this.isUsed(pos1)) break;
        }
        while (true) {
            try2++;
            pos2 = this.getPos(obstaclePos.u - uSub * try2, obstaclePos.v - vSub * try2);
            if (!pos2 || !this.isUsed(pos2)) break;
        }
        if (!pos1 && !pos2) return null;
        if (!pos1 && pos2) return pos2;
        if (pos1 && !pos2) return pos1;
        if (try1 <= try2) return pos1;
        if (try1 > try2) return pos2;
    }

    private checkDir(curPos: TilePos, prePos?: TilePos, nextPos?: TilePos) {
        let oldDir: string = this.tileDir[`${curPos.u}-${curPos.v}`];
        let dir: string[] = oldDir?.split('') || [];
        let u: number, v: number;
        if (prePos) {
            u = prePos.u - curPos.u;
            v = prePos.v - curPos.v;
            no.addToArray(dir, this.getDir(u, v));
        }
        if (nextPos) {
            u = nextPos.u - curPos.u;
            v = nextPos.v - curPos.v;
            no.addToArray(dir, this.getDir(u, v));
        }
        if (dir.length == 1) {
            no.addToArray(dir, this.getDir(-u, -v));
        }
        dir.sort((a, b) => { return Number(a) - Number(b); });
        this.tileDir[`${curPos.u}-${curPos.v}`] = dir.join('');
    }

    private getDir(u: number, v: number): string {
        if (u != 0) return u > 0 ? '3' : '1';
        if (v != 0) return v > 0 ? '0' : '2';
    }

    private getAllPointsPath(points: TilePos[]): TilePos[] {
        let allPath: TilePos[] = [];
        for (let i = 0, n = points.length; i < n - 1; i++) {
            let path = this.getTowPointPath(points[i], points[i + 1], allPath[allPath.length - 2]);
            if (allPath.length > 0) path.shift();
            allPath = allPath.concat(path);
        }
        return allPath;
    }

    protected async pave() {
        this.initDirTiles();
        this.setValidGridPos();
        if (this.container.uuid == this.node.uuid)
            this.container.removeAllChildren();
        await this.pavePathes();
        this.scheduleOnce(() => {
            this.container.children.sort((a, b) => {
                return b.position.y - a.position.y;
            });
        }, 0.1);
    }

    protected createGrid(pos: TilePos, tileInfo?: TileInfo) {
        const name = `${pos.u}_${pos.v}`;
        let node = this.container.getChildByName(name);
        if (!tileInfo) {
            const idx = no.weightRandomObject(this.tileInfos, 'weight');
            tileInfo = this.tileInfos[idx];
        }

        if (!node) {
            node = new Node(name);
            node.layer = Layers.Enum.UI_2D;
            node.addComponent(UITransform).setContentSize(this.gridSize);
            node.setPosition(pos.x, pos.y);
            node.parent = this.container;
        }

        if (this.shape == TileShapeEnum.Square) {
            const sprite = node.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.type = Sprite.Type.SLICED;
            sprite.spriteFrame = this._gridSpriteFrame;
        }
        const tile = tileInfo.tileNode.getComponent(Tile);
        this.setTile(node, tile);
        this.setGridUV(node, pos);
        this.useGrid(pos);
    }

    private getPos(uv: UV): TilePos | null;
    private getPos(u: number, v: number): TilePos | null;
    private getPos(u: number | UV, v?: number): TilePos | null {
        let _u: number, _v: number;
        if (u instanceof UV) {
            _u = u.u;
            _v = u.v;
        } else {
            _u = u;
            _v = v;
        }
        for (let i = 0, n = this._gridpos.length; i < n; i++) {
            const pos = this._gridpos[i];
            if (pos.u == _u && pos.v == _v) return pos;
        }
        return null;
    }
}


