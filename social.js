/* =========================================================
   STUDENT - SOCIAL SYSTEM
   Follow / Requests / Block
========================================================= */


/* =========================================================
   متابعة مستخدم
========================================================= */

async function socialFollow(userId) {

    if (!window.supabase || !supabaseClient) {
        return {
            success: false,
            status: "supabase_not_ready"
        };
    }

    if (
        typeof currentUser === "undefined" ||
        !currentUser
    ) {
        return {
            success: false,
            status: "not_authenticated"
        };
    }

    try {

        const { data, error } =
            await supabaseClient.rpc(
                "follow_user",
                {
                    p_user_id: userId
                }
            );

        if (error) {
            throw error;
        }

        return {
            success: true,
            status: data
        };

    } catch (error) {

        console.error(
            "Follow error:",
            error
        );

        return {
            success: false,
            status: "error",
            error
        };
    }
}


/* =========================================================
   إلغاء المتابعة
========================================================= */

async function socialUnfollow(userId) {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return {
            success: false,
            status: "not_authenticated"
        };
    }

    try {

        const { data, error } =
            await supabaseClient.rpc(
                "unfollow_user",
                {
                    p_user_id: userId
                }
            );

        if (error) {
            throw error;
        }

        return {
            success: true,
            status: data
        };

    } catch (error) {

        console.error(
            "Unfollow error:",
            error
        );

        return {
            success: false,
            status: "error",
            error
        };
    }
}


/* =========================================================
   قبول طلب متابعة
========================================================= */

async function socialAcceptRequest(
    requestId
) {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return {
            success: false,
            status: "not_authenticated"
        };
    }

    try {

        const { data, error } =
            await supabaseClient.rpc(
                "accept_follow_request",
                {
                    p_request_id:
                        requestId
                }
            );

        if (error) {
            throw error;
        }

        return {
            success: true,
            status: data
        };

    } catch (error) {

        console.error(
            "Accept request error:",
            error
        );

        return {
            success: false,
            status: "error",
            error
        };
    }
}


/* =========================================================
   رفض طلب متابعة
========================================================= */

async function socialRejectRequest(
    requestId
) {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return {
            success: false,
            status: "not_authenticated"
        };
    }

    try {

        const { data, error } =
            await supabaseClient.rpc(
                "reject_follow_request",
                {
                    p_request_id:
                        requestId
                }
            );

        if (error) {
            throw error;
        }

        return {
            success: true,
            status: data
        };

    } catch (error) {

        console.error(
            "Reject request error:",
            error
        );

        return {
            success: false,
            status: "error",
            error
        };
    }
}


/* =========================================================
   حظر مستخدم
========================================================= */

async function socialBlock(userId) {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return {
            success: false,
            status: "not_authenticated"
        };
    }

    try {

        const { data, error } =
            await supabaseClient.rpc(
                "block_user",
                {
                    p_user_id: userId
                }
            );

        if (error) {
            throw error;
        }

        return {
            success: true,
            status: data
        };

    } catch (error) {

        console.error(
            "Block error:",
            error
        );

        return {
            success: false,
            status: "error",
            error
        };
    }
}


/* =========================================================
   فك الحظر
========================================================= */

async function socialUnblock(userId) {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return {
            success: false,
            status: "not_authenticated"
        };
    }

    try {

        const { data, error } =
            await supabaseClient.rpc(
                "unblock_user",
                {
                    p_user_id: userId
                }
            );

        if (error) {
            throw error;
        }

        return {
            success: true,
            status: data
        };

    } catch (error) {

        console.error(
            "Unblock error:",
            error
        );

        return {
            success: false,
            status: "error",
            error
        };
    }
}


/* =========================================================
   معرفة هل يوجد حظر
========================================================= */

async function socialIsBlocked(userId) {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return false;
    }

    try {

        const { data, error } =
            await supabaseClient
                .from("blocks")
                .select("id")
                .or(
                    `and(blocker_id.eq.${currentUser.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${currentUser.id})`
                )
                .limit(1);

        if (error) {
            throw error;
        }

        return Array.isArray(data) &&
            data.length > 0;

    } catch (error) {

        console.error(
            "Block check error:",
            error
        );

        return false;
    }
}


/* =========================================================
   حالة المتابعة
========================================================= */

async function socialGetFollowStatus(
    userId
) {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return "none";
    }

    if (currentUser.id === userId) {
        return "self";
    }

    try {

        const blocked =
            await socialIsBlocked(
                userId
            );

        if (blocked) {
            return "blocked";
        }


        const { data: followingData } =
            await supabaseClient
                .from("follows")
                .select("id")
                .eq(
                    "follower_id",
                    currentUser.id
                )
                .eq(
                    "following_id",
                    userId
                )
                .maybeSingle();


        if (followingData) {
            return "following";
        }


        const { data: requestData } =
            await supabaseClient
                .from("follow_requests")
                .select("id,status")
                .eq(
                    "sender_id",
                    currentUser.id
                )
                .eq(
                    "receiver_id",
                    userId
                )
                .eq(
                    "status",
                    "pending"
                )
                .maybeSingle();


        if (requestData) {
            return "request_pending";
        }


        return "none";

    } catch (error) {

        console.error(
            "Follow status error:",
            error
        );

        return "none";
    }
}


/* =========================================================
   الحصول على طلبات المتابعة الواردة
========================================================= */

async function socialGetIncomingRequests() {

    if (
        !supabaseClient ||
        !currentUser
    ) {
        return [];
    }

    try {

        const { data, error } =
            await supabaseClient
                .from("follow_requests")
                .select(`
                    id,
                    sender_id,
                    status,
                    created_at
                `)
                .eq(
                    "receiver_id",
                    currentUser.id
                )
                .eq(
                    "status",
                    "pending"
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        return data || [];

    } catch (error) {

        console.error(
            "Requests error:",
            error
        );

        return [];
    }
}


/* =========================================================
   الواجهة العامة للملف
========================================================= */

window.StudentSocial = {

    follow:
        socialFollow,

    unfollow:
        socialUnfollow,

    acceptRequest:
        socialAcceptRequest,

    rejectRequest:
        socialRejectRequest,

    block:
        socialBlock,

    unblock:
        socialUnblock,

    isBlocked:
        socialIsBlocked,

    getFollowStatus:
        socialGetFollowStatus,

    getIncomingRequests:
        socialGetIncomingRequests
};
