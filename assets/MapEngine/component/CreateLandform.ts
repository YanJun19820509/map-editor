import { CCInteger, Enum, Label, LabelOutline, Sprite, SpriteFrame, UITransform } from 'cc';
import { math } from 'cc';
import { Layers } from 'cc';
import { _decorator, Component, Node } from 'cc';
import { no } from '../../NoUi3/no';
import { Tile, TileShapeEnum } from './Tile';
import { Range } from '../../NoUi3/types'
import { CreateMapObjectBase, TileInfo, TilePos } from './CreateMapObjectBase';
const { ccclass, property, executeInEditMode } = _decorator;


//创建地形地貌
@ccclass('CreateLandform')
@executeInEditMode()
export class CreateLandform extends CreateMapObjectBase {
    @property({ displayName: '地砖形状', type: Enum(TileShapeEnum) })
    shape: TileShapeEnum = TileShapeEnum.Square;
    @property({ displayName: '格子尺寸' })
    gridSize: math.Size = math.size(50, 50);
    @property({ displayName: '格子数', readonly: true })
    gridsNum: string = '';
    @property({ type: TileInfo, displayName: '需要的地砖' })
    tileInfos: TileInfo[] = [];
    @property
    doCheck: boolean = false;
    @property({ type: Range, displayName: '地砖间隔区间', tooltip: '两块地砖之间最小间隔格子数' })
    density: Range = new Range();
    @property({ type: math.Rect, displayName: '特定区域' })
    spaces: math.Rect[] = [];
    @property({ displayName: '特定区域为空地' })
    isEmpty: boolean = true;
    @property({ displayName: '地砖格子内居中', visible() { return this.shape == TileShapeEnum.Square } })
    isCenter: boolean = true;
    @property({ displayName: '显示格子区域', visible() { return this.shape == TileShapeEnum.Square } })
    showArea: boolean = true;
    @property({ type: Node, displayName: '地板容器' })
    container: Node = null;
    @property({ displayName: '显示格子坐标' })
    showGridUV: boolean = true;
    @property({ displayName: '创建' })
    run: boolean = false;
    @property({ displayName: '清除' })
    clear: boolean = false;

    protected _oldShape: TileShapeEnum;
    protected _oldGridSize: math.Size = math.size(50, 50);
    protected _oldContentSize: math.Size;

    protected _gridSpriteFrame: SpriteFrame;

    public get config(): any {
        let tiles: any[] = [];
        this.tileInfos.forEach(a => {
            tiles.push(a.config);
        });
        let spaces: any[] = [];
        this.spaces.forEach(a => {
            spaces.push([a.x, a.y, a.width, a.height]);
        });
        return {
            name: this.node.name,
            shape: this.shape,
            gridSize: [this.gridSize.width, this.gridSize.height],
            tileInfos: tiles,
            density: [this.density.min, this.density.max],
            spaces: spaces,
            isEmpty: this.isEmpty,
            isCenter: this.isCenter,
            container: this.container.name,
            isEnable: this.node.active
        };
    }

    public setConfig(v: any) {
        super.setConfig(v);
        this.node.active = v.isEnable;
    }

    onLoad() {
        if (!this.container) this.container = this.node;
        this._oldContentSize = this.container.getComponent(UITransform).contentSize.clone();
        no.assetBundleManager.loadSpriteFrameInEditorMode('db://assets/MapEngine/grid.png', sf => {
            this._gridSpriteFrame = sf;
        });
    }

    update(deltaTime: number) {
        if (this._oldShape != this.shape || !this._oldGridSize.equals(this.gridSize) || !this.container.getComponent(UITransform).contentSize.equals(this._oldContentSize)) {
            this._oldShape = this.shape;
            this._oldGridSize = this.gridSize;
            this._oldContentSize = this.container.getComponent(UITransform).contentSize.clone();
            if (this.shape != TileShapeEnum.Square) this.isCenter = true;
            this.setGridPositions();
        }
        if (this.run) {
            this.run = false;
            this.pave();
        }
        if (this.clear) {
            this.clear = false;
            this.container.removeAllChildren();
        }
        if (this.doCheck) {
            this.doCheck = false;
            this.tileInfos.forEach(a => {
                a.check();
            });
        }
    }

    protected async pave() {
        this._usedGrid.length = 0;
        const n = this._gridpos.length;
        if (this.container.uuid == this.node.uuid)
            this.container.removeAllChildren();
        let emptyNum = this.density.randomValue;
        let point = math.v2();
        for (let i = 0; i < n; i++) {
            if (emptyNum > 0) {
                emptyNum--;
                continue;
            } else if (emptyNum <= 0) {
                emptyNum = this.density.randomValue;
            }
            const pos = this._gridpos[i];
            point.set(pos.x, pos.y);
            const isIn = this.checkInSpace(point);
            if (isIn && this.isEmpty) continue;
            if (!isIn && !this.isEmpty) continue;
            this.createGrid(pos);
            await no.sleep(0.02);
        }
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

        if (this.shape == TileShapeEnum.Square && this.showArea) {
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

    protected setTile(gridNode: Node, tileComp: Tile) {
        let tile = gridNode.getChildByName(tileComp.spriteFrame.name);
        if (!tile) {
            tile = new Node(tileComp.spriteFrame.name);
            tile.layer = Layers.Enum.UI_2D;
            tile.addComponent(UITransform);
            tile.addComponent(Sprite);
            tile.parent = gridNode;
        }
        tile.getComponent(Sprite).spriteFrame = tileComp.spriteFrame;
        if (this.isCenter) {
            tile.setPosition(0, -tileComp.thickness / 2);
        } else {
            const w = this.gridSize.width / 2,
                h = this.gridSize.height / 2;
            tile.setPosition(no.randomBetween(-w, w), no.randomBetween(-h, h))
        }
    }

    protected setGridUV(parent: Node, pos: TilePos) {
        if (!this.showGridUV) return;
        let node = new Node('label');
        node.layer = Layers.Enum.UI_2D;
        node.addComponent(UITransform);
        let label = node.addComponent(Label);
        label.color = no.str2Color('#000000');
        label.isBold = true;
        label.string = `${pos.u}, ${pos.v}`;
        let outline = node.addComponent(LabelOutline);
        outline.width = 2;
        outline.color = no.str2Color('#ffffff');
        node.parent = parent;
    }
}


