import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
import { CreateLandform } from './CreateLandform';
import { CreatePath } from './CreatePath';
import { Tile } from './Tile';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('CreateMapLands')
@executeInEditMode()
export class CreateMapLands extends Component {
    @property({ type: Prefab, displayName: '地面prefab' })
    landPrefab: Prefab = null;
    @property({ type: Prefab, displayName: '路径prefab' })
    pathPrefab: Prefab = null;
    @property({ displayName: '创建空地面' })
    create_Landform: boolean = false;
    @property({ displayName: '创建路径' })
    create_Path: boolean = false;

    update() {
        if (this.create_Landform) {
            this.create_Landform = false;
            this.createLandform();
        }
        if (this.create_Path) {
            this.create_Path = false;
            this.createPath();
        }
    }

    public createLand(v: any, tiles: Tile[]): void {
        if (v.isPath) {
            this.createPath(v, tiles);
        } else {
            this.createLandform(v, tiles);
        }
    }

    private createLandform(v?: any, tiles?: Tile[]): void {
        if (!this.landPrefab) return;
        const land = instantiate(this.landPrefab);
        land.parent = this.node;
        if (!v) land.name = 'new land';
        else {
            land.name = v.name;
            const clf = land.getComponent(CreateLandform);
            clf.setConfig(v);
            clf.setTileInfos(v.tileInfos, tiles);
        }
    }

    private createPath(v?: any, tiles?: Tile[]): void {
        if (!this.pathPrefab) return;
        const land = instantiate(this.pathPrefab);
        land.parent = this.node;
        if (!v) land.name = 'new path';
        else {
            land.name = v.name;
            const clf = land.getComponent(CreatePath);
            clf.setConfig(v);
            clf.setTileInfos(v.tileInfos, tiles);
        }
    }
}


