<template>
  <div>
    <Card shadow title="项目">
      <row class="join-page" :gutter="32">
        <i-col span="10">
          <img class="qq-group-img" src="../assets/images/qq_share.jpg">
          <row type="flex" justify="center">
            <i-col span="12">
              <p>QQ 群号：1015173091</p>
            </i-col>
            <i-col span="12"></i-col>
          </row>
        </i-col>
        <i-col span="14">
          <div class="join-page-other">
            <Button to="https://www.tapd.cn/62658090/prong/stories/stories_list" target="_blank" size="large">
              <span class="join-page-other-icon tapd"></span>
              TAPD项目中心
            </Button>
            <Button to="https://github.com/Asa-kura/Vuedemo" target="_blank" size="large">
              <span class="join-page-other-icon git"></span>
              Github源码
            </Button>
            <Button to="https://live.bilibili.com/1353202" target="_blank" size="large">
              <img src="../assets/images/icon-social-bilibili.svg" class="join-page-other-icon">
              活动直播间
            </Button>
            <Button to="https://twitter.com/iViewUI" target="_blank" size="large">
              <img src="../assets/images/icon-social-twitter.svg" class="join-page-other-icon">
              Twitter
            </Button>
          </div>
        </i-col>
      </row>
    </Card>
  </div>
</template>

<script>
  export default {
    name: 'join_page',
    data() {
      return {
      }
    }
  }
</script>
<style>
  .ivu-btn .tapd {
    display: inline-block;
    width: 20px;
    height: 20px;
    background: url("../assets/images/logo-tapd.png");
    background-size: 100% auto;
  }

  .ivu-btn:hover .tapd {
    background: url("../assets/images/logo-tapd.gif");
    background-size: 100% auto;
  }

  .ivu-btn .git {
    display: inline-block;
    width: 20px;
    height: 20px;
    background: url("../assets/images/logo-git.png");
    background-size: 100% auto;
  }

  .ivu-btn:hover .git {
    background: url("../assets/images/logo-git.gif");
    background-size: 100% auto;
  }

  .join-page {
    text-align: center;
  }

  .qq-group-img {
    width: 100%;
  }

  .join-page-other-icon {
    width: 20px;
    vertical-align: middle;
    margin-right: 6px;
  }

  .join-page-other {
    text-align: left;
  }

  .join-page-other .ivu-btn {
    margin-right: 6px;
  }
</style>