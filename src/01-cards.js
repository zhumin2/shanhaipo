/* ============ 卡牌数据（P0 全集 21 张 = 16 神兽 + 5 神器，与产品设计文档 §6.2 全卡表一致） ============ */
function C(id,name,cost,atk,hp,element,aura,effect,skill,source){
  return {id,name,cost,atk,hp,element,aura,effect,skill,source, kind: atk>0?"creature":"artifact"};
}
const CARDS = [
  // 金系
  C("W1","白虎",5,5,6,"金","凶",null,{name:"庚金啸",cost:4,type:"allEnemy",value:1,desc:"敌方所有神兽 −1"}, "《西山经》"),
  C("W2","獬豸",2,2,3,"金","祥",{type:"onEnter",fx:"enemyAtkDown",value:1,desc:"进场：敌方一神兽本回合攻击 −1"},{name:"明断",cost:2,type:"enemyAtkDown",value:2,desc:"敌方一神兽本回合攻击 −2"}, "《西山经》"),
  C("W3","狰",4,4,5,"金","凶",null,{name:"锐角",cost:3,type:"selfAtkUp",value:2,desc:"本回合攻击 +2"}, "《西山经》"),
  C("A1","轩辕剑",4,0,0,"金",null,{type:"damage",target:"enemyCreature",value:4,desc:"对敌方一个神兽造成 4 点伤害"},null, "黄帝轩辕"),
  // 木系
  C("M1","白泽",3,3,4,"木","祥",{type:"onEnter",fx:"peek",desc:"进场：查看对手 1 张手牌"},{name:"洞见",cost:2,type:"draw",value:2,desc:"抽 2 张牌"}, "《西山经》"),
  C("M2","精卫",1,1,2,"木","祥",{type:"death",fx:"reshuffle",desc:"亡语：将本卡洗回牌库"},{name:"衔石",cost:1,type:"selfAtkUp",value:1,desc:"本回合攻击 +1"}, "《北山经》"),
  C("M3","乘黄",2,2,3,"木","祥",{type:"onEnter",fx:"allyAtkUp",value:1,desc:"进场：友方神兽本回合 +1 攻击"},{name:"驰骋",cost:2,type:"buffAll",value:1,desc:"友方神兽 +1/+1"}, "《海外西经》"),
  C("A2","神农鼎",3,0,0,"木",null,{type:"heal",target:"ownCreature",value:3,desc:"友方神兽恢复 3 点生命"},null, "上古神器"),
  // 水系
  C("W4","玄武",6,6,7,"水","祥",{type:"passive",fx:"hpReduce",desc:"你的本源受到伤害 −1"},{name:"玄冥",cost:5,type:"healHp",value:4,desc:"本源恢复 4 点"}, "《海外北经》"),
  C("W5","应龙",6,6,7,"水","凶",{type:"onEnter",fx:"damageEnemy",value:2,desc:"进场：对敌方一神兽造成 2 点伤害"},{name:"兴雨",cost:5,type:"damageHp",value:3,desc:"敌方本源 −3"}, "《大荒北经》"),
  C("W6","夫诸",3,3,4,"水","祥",null,{name:"止水",cost:2,type:"freeze",desc:"冻结敌方一神兽（本回合不能攻击）"}, "《中山经》"),
  C("A3","定海神针",3,0,0,"水",null,{type:"buffHp",target:"ownCreature",value:3,desc:"友方神兽生命 +3"},null, "《海内经》"),
  // 火系
  C("F1","毕方",2,2,3,"火","祥",{type:"onEnter",fx:"damageHp",value:1,desc:"进场：敌方本源 −1"},{name:"焚羽",cost:2,type:"allEnemy",value:1,desc:"敌方所有神兽 −1"}, "《西山经》"),
  C("F2","九婴",5,5,6,"火","凶",null,{name:"九首",cost:4,type:"damage",target:"enemyCreature",value:3,desc:"敌方一神兽 −3"}, "《海外南经》"),
  C("F3","三足乌",1,1,3,"火","祥",null,{name:"曜日",cost:1,type:"damageHp",value:1,desc:"敌方本源 −1"}, "《大荒东经》"),
  C("A4","射日弓",5,0,0,"火",null,{type:"damageHpCond",value:3,desc:"敌方本源 −3；若你场上有火系神兽再 −2"},null, "羿射九日"),
  C("A5","番天印",3,0,0,"土",null,{type:"seal",target:"enemyCreature",value:0,desc:"镇封敌方一个破封神兽：翻回封印态，本局不可再破封"},null, "上古神器"),
  // 土系
  C("E1","九尾狐",4,4,5,"土","祥",{type:"death",fx:"draw",value:1,desc:"亡语：抽 1 张牌"},{name:"魅惑",cost:3,type:"freeze",desc:"敌方一神兽本回合无法攻击"}, "《南山经》"),
  C("E2","饕餮",5,5,6,"土","凶",null,{name:"吞噬",cost:4,type:"destroyLe3",desc:"消灭一个生命 ≤3 的敌方神兽"}, "《北山经》"),
  C("E3","刑天",6,6,7,"土","凶",{type:"death",fx:"immuneOnce",desc:"亡语：本局你下一次致命伤害被抵消"},{name:"干戚",cost:5,type:"damageHp",value:3,desc:"敌方本源 −3"}, "《海外西经》"),
  C("E4","开明兽",4,4,5,"土","祥",null,{name:"九门",cost:3,type:"draw",value:1,desc:"抽 1 张牌"}, "《海内西经》"),
];

